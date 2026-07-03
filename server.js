const express = require('express');
const app = express();
const path = require('path');
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// ????? ??????? ??????? ?? ?????? ??????? ???????
app.use(express.static(path.join(__dirname)));

// ????? ???????? ???? index.html ??? ????? ?????? ???????
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ??????? ????? ?????? ?????????
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
let queue30p = []; // ?????? ???????? ?????? ?????? ?????? (????? ??? 30 ????)
let queueCoop = []; // ?????? ???????? ?????? ?????? ?????? (???????? ?? ???????)

io.on('connection', (socket) => {
    console.log(`Soldier connected to network: ${socket.id}`);

    // ????? ???? ??????? ?????? ??? ???????
    networkPlayers[socket.id] = {
        id: socket.id,
        x: 2000,
        y: 2000,
        angle: 0,
        isMoving: false,
        legCycle: 0,
        hp: 100,
        nickname: "Soldier",
        roomId: null
    };

    // 2. ????? ??????? ??????? ?????? ???? 1 ?? 1 (1v1)
    socket.on('join1v1Queue', (userData) => {
        // ????? ???? ???? ???????
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
            
            // ??? ??????? ??????? ???????
            let s1 = io.sockets.sockets.get(p1.socketId);
            let s2 = io.sockets.sockets.get(p2.socketId);

            if (s1) s1.join(roomId);
            if (s2) s2.join(roomId);

            if(networkPlayers[p1.socketId]) { networkPlayers[p1.socketId].roomId = roomId; networkPlayers[p1.socketId].hp = 100; }
            if(networkPlayers[p2.socketId]) { networkPlayers[p2.socketId].roomId = roomId; networkPlayers[p2.socketId].hp = 100; }

            let spawnP1 = { x: 300, y: 300 };
            let spawnP2 = { x: 3700, y: 3700 };

            io.to(p1.socketId).emit('matchFound', { spawn: spawnP1, roomId: roomId });
            io.to(p2.socketId).emit('matchFound', { spawn: spawnP2, roomId: roomId });

            console.log(`Match 1v1 initialized between ${p1.nickname} and ${p2.nickname} in room ${roomId}`);
        }
    });

    // ????? ??????? ??????? ?????? ????? ?????? (WAR ROOM 30)
    socket.on('join30pQueue', (userData) => {
        queue30p = queue30p.filter(p => p.socketId !== socket.id);
        queue30p.push({
            socketId: socket.id,
            nickname: userData.nickname,
            email: userData.email
        });

        // ????? ???? ????? ?????? ?????? ???? ?????? ???? ????? ??????? ?????
        if (queue30p.length >= 2) {
            let p1 = queue30p.shift();
            let p2 = queue30p.shift();

            let roomId = "room_30p_" + Date.now();
            let s1 = io.sockets.sockets.get(p1.socketId);
            let s2 = io.sockets.sockets.get(p2.socketId);

            if (s1) s1.join(roomId);
            if (s2) s2.join(roomId);

            if(networkPlayers[p1.socketId]) { networkPlayers[p1.socketId].roomId = roomId; networkPlayers[p1.socketId].hp = 100; }
            if(networkPlayers[p2.socketId]) { networkPlayers[p2.socketId].roomId = roomId; networkPlayers[p2.socketId].hp = 100; }

            io.to(p1.socketId).emit('matchFound', { spawn: { x: 500, y: 1500 }, roomId: roomId });
            io.to(p2.socketId).emit('matchFound', { spawn: { x: 3500, y: 1500 }, roomId: roomId });

            console.log(`Match WAR ROOM 30 started between ${p1.nickname} and ${p2.nickname}`);
        }
    });

    // ????? ??????? ??????? ?????? ????? ?????? (CO-OP VS BOTS)
    socket.on('joinCoopQueue', (userData) => {
        queueCoop = queueCoop.filter(p => p.socketId !== socket.id);
        queueCoop.push({
            socketId: socket.id,
            nickname: userData.nickname,
            email: userData.email
        });

        if (queueCoop.length >= 2) {
            let p1 = queueCoop.shift();
            let p2 = queueCoop.shift();

            let roomId = "room_coop_" + Date.now();
            let s1 = io.sockets.sockets.get(p1.socketId);
            let s2 = io.sockets.sockets.get(p2.socketId);

            if (s1) s1.join(roomId);
            if (s2) s2.join(roomId);

            if(networkPlayers[p1.socketId]) { networkPlayers[p1.socketId].roomId = roomId; networkPlayers[p1.socketId].hp = 100; }
            if(networkPlayers[p2.socketId]) { networkPlayers[p2.socketId].roomId = roomId; networkPlayers[p2.socketId].hp = 100; }

            io.to(p1.socketId).emit('matchFound', { spawn: { x: 2000, y: 3500 }, roomId: roomId });
            io.to(p2.socketId).emit('matchFound', { spawn: { x: 2100, y: 3500 }, roomId: roomId });

            console.log(`Match CO-OP VS BOTS initialized for ${p1.nickname} and ${p2.nickname}`);
        }
    });

    // 3. ????? ?????? ???? ???????? ?????? ??????? ????? ????? ????????
    socket.on('playerInput', (data) => {
        if (!networkPlayers[socket.id]) return;

        networkPlayers[socket.id].x = data.x;
        networkPlayers[socket.id].y = data.y;
        networkPlayers[socket.id].angle = data.angle;
        networkPlayers[socket.id].isMoving = data.isMoving;
        networkPlayers[socket.id].legCycle = data.legCycle;
        networkPlayers[socket.id].nickname = data.nickname || networkPlayers[socket.id].nickname;
        
        let roomId = networkPlayers[socket.id].roomId;
        if (roomId) {
            // ????? ???????? ?????? ????????? ??? ?????? ??? ?????? ?????? ????? ???????? ??????? ???????
            let roomPlayers = {};
            for (let id in networkPlayers) {
                if (networkPlayers[id].roomId === roomId) {
                    roomPlayers[id] = networkPlayers[id];
                }
            }
            io.to(roomId).emit('gameUpdate', { players: roomPlayers, bullets: [] });
        } else {
            io.emit('gameUpdate', { players: networkPlayers, bullets: [] });
        }
    });

    // 4. ?????? ?????? ????? ?????
    socket.on('fireBullet', (bulletData) => {
        let roomId = networkPlayers[socket.id] ? networkPlayers[socket.id].roomId : null;
        if (roomId) {
            socket.to(roomId).emit('bulletFired', bulletData);
        } else {
            socket.broadcast.emit('bulletFired', bulletData);
        }
    });

    // 5. ??????? ?????? ???? ????? ????????
    socket.on('takeDamage', (data) => {
        if (networkPlayers[socket.id]) {
            networkPlayers[socket.id].hp = Math.max(0, networkPlayers[socket.id].hp - data.damage);
            let roomId = networkPlayers[socket.id].roomId;
            if (roomId) {
                let roomPlayers = {};
                for (let id in networkPlayers) {
                    if (networkPlayers[id].roomId === roomId) {
                        roomPlayers[id] = networkPlayers[id];
                    }
                }
                io.to(roomId).emit('gameUpdate', { players: roomPlayers });
            } else {
                io.emit('gameUpdate', { players: networkPlayers });
            }
        }
    });

    // 6. ?????? ?? ????? ????????
    socket.on('leaveQueue', () => {
        queue1v1 = queue1v1.filter(p => p.socketId !== socket.id);
        queue30p = queue30p.filter(p => p.socketId !== socket.id);
        queueCoop = queueCoop.filter(p => p.socketId !== socket.id);
        
        let roomId = networkPlayers[socket.id] ? networkPlayers[socket.id].roomId : null;
        if (roomId) {
            socket.leave(roomId);
            networkPlayers[socket.id].roomId = null;
        }
    });

    // ?????? ??? ??????? ?????? ??????
    socket.on('disconnect', () => {
        console.log(`Soldier disconnected: ${socket.id}`);
        let roomId = networkPlayers[socket.id] ? networkPlayers[socket.id].roomId : null;
        
        delete networkPlayers[socket.id];
        queue1v1 = queue1v1.filter(p => p.socketId !== socket.id);
        queue30p = queue30p.filter(p => p.socketId !== socket.id);
        queueCoop = queueCoop.filter(p => p.socketId !== socket.id);

        if (roomId) {
            let roomPlayers = {};
            for (let id in networkPlayers) {
                if (networkPlayers[id].roomId === roomId) {
                    roomPlayers[id] = networkPlayers[id];
                }
            }
            io.to(roomId).emit('gameUpdate', { players: roomPlayers });
        } else {
            io.emit('gameUpdate', { players: networkPlayers });
        }
    });
});

// ????? ??????? ??? ?????? ??????
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`[TACTICAL SERVER RUNNING ACTIVE ON PORT ${PORT}]`);
});