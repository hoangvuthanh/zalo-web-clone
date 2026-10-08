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
    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    await page.goto('https://chat.zalo.me/', { waitUntil: 'networkidle2' });

    setInterval(async () => {
        try {
            const qrData = await page.evaluate(() => {
                const qrImg = document.querySelector('.qr-code img');
                return qrImg ? qrImg.src : null;
            });
            if (qrData) {
                io.emit('qr_code', qrData);
                io.emit('status', 'Vui lòng quét mã QR để đăng nhập');
            }
        } catch (error) {}
    }, 3000);
}

startZalo();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server chạy port ${PORT}`));