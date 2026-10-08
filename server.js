const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

io.on('connection', (socket) => {
    socket.emit('status', 'Đang khởi động hệ thống Zalo...');
});

async function startZalo() {
    try {
        console.log('--- BẮT ĐẦU CHẠY ZALO ---');
        const browser = await puppeteer.launch({ 
            headless: true, 
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--single-process',
                '--no-zygote'
            ] 
        });
        console.log('1. Đã mở xong trình duyệt ảo');
        
        const page = await browser.newPage();
        console.log('2. Đang vào trang Zalo...');
        
        await page.goto('https://chat.zalo.me/', { waitUntil: 'domcontentloaded', timeout: 60000 });
        console.log('3. Đã vào Zalo, đang chờ mã QR...');

        setInterval(async () => {
            try {
                const qrData = await page.evaluate(() => {
                    const qrImg = document.querySelector('img[alt="QR code"], .qr-code img');
                    return qrImg ? qrImg.src : null;
                });
                
                if (qrData) {
                    io.emit('qr_code', qrData);
                    io.emit('status', 'Vui lòng quét mã QR để đăng nhập');
                }
            } catch (error) {}
        }, 3000);

    } catch (error) {
        console.error('LỖI HỆ THỐNG:', error.message);
        io.emit('status', 'Lỗi: ' + error.message);
    }
}

startZalo();

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Server chạy port ${PORT}`));
