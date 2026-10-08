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
        console.log('1. Đang khởi động trình duyệt ảo...');
        const browser = await puppeteer.launch({ 
            headless: "new", 
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage' // Chống lỗi kẹt RAM trên Docker Railway
            ] 
        });
        
        console.log('2. Đang mở tab mới...');
        const page = await browser.newPage();
        
        console.log('3. Đang truy cập Zalo Web (có thể mất 10-20 giây)...');
        await page.goto('https://chat.zalo.me/', { waitUntil: 'networkidle2', timeout: 60000 });
        
        console.log('4. Truy cập thành công, đang quét tìm mã QR...');
        setInterval(async () => {
            try {
                const qrData = await page.evaluate(() => {
                    // Mở rộng bộ chọn để đề phòng Zalo đổi class HTML
                    const qrImg = document.querySelector('.qr-code img, .qrcode img, img[alt="QR code"]');
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server chạy port ${PORT}`));
