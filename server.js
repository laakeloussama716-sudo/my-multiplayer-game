const express = require('express');
const app = express();
const path = require('path');
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// ????? ??????? ??????? ?? ?????? ??????? ?????? (Racine) ???? ?? ???? ???? public
app.use(express.static(path.join(__dirname)));

// ????? ???????? ???? index.html ??? ?????? ??????
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ??????? ??????? ??????
let networkPlayers = {};
let activeRooms = {};

const serverObstacles = [
    { x: 500, y: 500, w: 250, h: 250 },
    { x: 2200, y: 900, w: 300, h: 200 },
    { x: 1400, y: 2500, w: 200, h: 300 },
    { x: 3100, y: 400, w: 220, h: 220 },
    { x: 800, y: 1600, w: 350, h: 180 },
    { x: 2500, y: 2900, w: 180, h: 180 }
];

const WORLD_SIZE = 4000;
let queue1v1 = [];
let coopQueue = [];

io.on('connection', (socket) => {
    console.log(`Soldier connected to network: ${socket.id}`);



    // 2. ???? ????? ?? ?????? 1v1
    socket.on('join1v1Queue', (userData) => {
        queue1v1 = queue1v1.filter(p => p.socketId !== socket.id);
        queue1v1.push({
            socketId: socket.id,
            nickname: userData.nickname,
            email: userData.email
        });

        if (queue1v1.length >= 2) {
            let p1 = queue1v1.shift();
            let p2 = queue1v1.shift();

            let roomId = "room_1v1_" + Date.now();
            let spawnP1 = { x: 300, y: 300 };
            let spawnP2 = { x: 3700, y: 3700 };

            io.to(p1.socketId).emit('matchFound', { spawn: spawnP1 });
            io.to(p2.socketId).emit('matchFound', { spawn: spawnP2 });

            console.log(`Match 1v1 initialized between ${p1.nickname} and ${p2.nickname}`);
        }
    });

    // 3. ????? ???? ???????? ?? ?????
    socket.on('playerInput', (data) => {
        networkPlayers[socket.id] = {
            id: socket.id,
            x: data.x,
            y: data.y,
            angle: data.angle,
            isMoving: data.isMoving,
            legCycle: data.legCycle,
            hp: networkPlayers[socket.id] ? networkPlayers[socket.id].hp : 100,
            nickname: networkPlayers[socket.id] ? networkPlayers[socket.id].nickname : "Soldier"
        };
        
        // ????? ??????? ????? ???????? ???????
        io.emit('gameUpdate', { players: networkPlayers, bullets: [] });
    });

    // 4. ????? ?????
    socket.on('fireBullet', (bulletData) => {
        socket.broadcast.emit('bulletFired', bulletData);
    });

    // 5. ??????? ?????
    socket.on('takeDamage', (data) => {
        if (networkPlayers[socket.id]) {
            networkPlayers[socket.id].hp = Math.max(0, networkPlayers[socket.id].hp - data.damage);
            io.emit('gameUpdate', { players: networkPlayers });
        }
    });

    // 6. ?????? ?? ????? ???????? ?? ??? ???????
    socket.on('leaveQueue', () => {
        queue1v1 = queue1v1.filter(p => p.socketId !== socket.id);
    });

    socket.on('disconnect', () => {
        console.log(`Soldier disconnected: ${socket.id}`);
        delete networkPlayers[socket.id];
        queue1v1 = queue1v1.filter(p => p.socketId !== socket.id);
        io.emit('gameUpdate', { players: networkPlayers });
    });
});

// ????? ??????? ??? ?????? ???????
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`[TACTICAL SERVER RUNNING ACTIVE ON PORT ${PORT}]`);
});