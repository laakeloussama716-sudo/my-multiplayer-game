const express = require('express');
const app = express();
const path = require('path');
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

let networkPlayers = {};
const WORLD_SIZE = 4000;

// ??? ?????? ???????? ?????????
const queue1v1 = [];
const queueBR = [];
const queueCoop = [];
const rooms = {};

const serverObstacles = [
    { 
        id: "house_alpha", x: 500, y: 500, w: 260, h: 260,
        door: { x: 580, y: 760, w: 90, h: 16 },
        walls: [
            {x: 500, y: 500, w: 260, h: 20}, {x: 500, y: 500, w: 20, h: 260},
            {x: 740, y: 500, w: 20, h: 260}, {x: 500, y: 740, w: 80, h: 20}, {x: 670, y: 740, w: 80, h: 20}
        ] 
    },
    { 
        id: "house_bravo", x: 2200, y: 900, w: 320, h: 220,
        door: { x: 2320, y: 1120, w: 90, h: 16 },
        walls: [
            {x: 2200, y: 900, w: 320, h: 20}, {x: 2200, y: 900, w: 20, h: 220},
            {x: 2500, y: 900, w: 20, h: 220}, {x: 2200, y: 1100, w: 120, h: 20}, {x: 2410, y: 1100, w: 110, h: 20}
        ] 
    }
];

function checkCollision(nx, ny, r, doorsState) {
    if (nx - r < 0 || nx + r > WORLD_SIZE || ny - r < 0 || ny + r > WORLD_SIZE) return true;
    for (let obs of serverObstacles) {
        for (let wall of obs.walls) {
            if (nx + r > wall.x && nx - r < wall.x + wall.w && ny + r > wall.y && ny - r < wall.y + wall.h) return true;
        }
        const activeDoor = doorsState.find(d => d.doorX === obs.door.x && d.doorY === obs.door.y);
        const isOpen = activeDoor ? activeDoor.isOpen : false;
        if (!isOpen) {
            let d = obs.door;
            if (nx + r > d.x && nx - r < d.x + d.w && ny + r > d.y && ny - r < d.y + d.h) return true;
        }
    }
    return false;
}

function getSafeSpawnCoords(doorsState) {
    let rx, ry, attempts = 0;
    while (attempts < 1000) {
        rx = Math.random() * (WORLD_SIZE - 400) + 200;
        ry = Math.random() * (WORLD_SIZE - 400) + 200;
        let insideBoundaries = false;
        for (let obs of serverObstacles) {
            if (rx + 20 > obs.x - 30 && rx - 20 < obs.x + obs.w + 30 && ry + 20 > obs.y - 30 && ry - 20 < obs.y + obs.h + 30) {
                insideBoundaries = true; break;
            }
        }
        if (!insideBoundaries && !checkCollision(rx, ry, 20, doorsState)) {
            return { x: rx, y: ry };
        }
        attempts++;
    }
    return { x: 2000, y: 2000 };
}

function cleanFromAllQueues(socketId) {
    [queue1v1, queueBR, queueCoop].forEach(queue => {
        const idx = queue.findIndex(p => p.socketId === socketId);
        if (idx !== -1) queue.splice(idx, 1);
    });
}

function checkAndStartMatches(queue, mode) {
    // ?????? ????? ????? ???? ?????? ????? (2) ?? ????? ????????!
    while (queue.length >= 2) {
        const p1 = queue.shift();
        const p2 = queue.shift();
        const roomId = `room_${mode}_${Date.now()}`;

        const initialDoors = serverObstacles.map(obs => ({
            doorX: obs.door.x, doorY: obs.door.y, isOpen: false
        }));

        const spawnP1 = getSafeSpawnCoords(initialDoors);
        const spawnP2 = getSafeSpawnCoords(initialDoors);

        rooms[roomId] = {
            id: roomId,
            mode: mode,
            players: {
                [p1.socketId]: { id: p1.socketId, x: spawnP1.x, y: spawnP1.y, r: 18, angle: 0, hp: 100, maxHp: 100, nickname: p1.nickname, email: p1.email, isMoving: false, legCycle: 0, gold: 0, weapon: 0, armor: 0 },
                [p2.socketId]: { id: p2.socketId, x: spawnP2.x, y: spawnP2.y, r: 18, angle: 0, hp: 100, maxHp: 100, nickname: p2.nickname, email: p2.email, isMoving: false, legCycle: 0, gold: 0, weapon: 0, armor: 0 }
            },
            bullets: [],
            doorsState: initialDoors,
            bots: []
        };

        const s1 = io.sockets.sockets.get(p1.socketId);
        const s2 = io.sockets.sockets.get(p2.socketId);

        if (s1) {
            s1.join(roomId); s1.roomId = roomId;
            s1.emit("matchFound", { spawn: spawnP1, roomId: roomId, mode: mode, opponent: { nickname: p2.nickname, email: p2.email } });
        }
        if (s2) {
            s2.join(roomId); s2.roomId = roomId;
            s2.emit("matchFound", { spawn: spawnP2, roomId: roomId, mode: mode, opponent: { nickname: p1.nickname, email: p1.email } });
        }
        console.log(`[Multiplayer] Game started in Room ${roomId}`);
    }
}

io.on('connection', (socket) => {
    socket.on("join1v1Queue", (userData) => {
        cleanFromAllQueues(socket.id);
        queue1v1.push({ socketId: socket.id, nickname: userData.nickname || "Soldier", email: userData.email || "" });
        checkAndStartMatches(queue1v1, "1v1");
    });

    socket.on("joinBRQueue", (userData) => {
        cleanFromAllQueues(socket.id);
        queueBR.push({ socketId: socket.id, nickname: userData.nickname || "Soldier", email: userData.email || "" });
        checkAndStartMatches(queueBR, "br");
    });

    socket.on("joinCoopQueue", (userData) => {
        cleanFromAllQueues(socket.id);
        queueCoop.push({ socketId: socket.id, nickname: userData.nickname || "Soldier", email: userData.email || "" });
        checkAndStartMatches(queueCoop, "coop");
    });

    socket.on("playerInput", (data) => {
        const rId = socket.roomId;
        if (rId && rooms[rId]) {
            const p = rooms[rId].players[socket.id];
            if (p) {
                p.x = data.x; p.y = data.y; p.angle = data.angle;
                p.isMoving = data.isMoving; p.legCycle = data.legCycle;
                if (data.weapon !== undefined) p.weapon = data.weapon;
                if (data.armor !== undefined) p.armor = data.armor;
            }
        }
    });

    socket.on("fireBullet", (bulletData) => {
        const rId = socket.roomId;
        if (rId && rooms[rId]) {
            const room = rooms[rId];
            const p = room.players[socket.id];
            if (p && p.hp > 0) {
                const dmgMap = [10, 22, 48];
                room.bullets.push({
                    owner: socket.id, x: bulletData.x, y: bulletData.y,
                    vx: Math.cos(bulletData.angle) * 15, vy: Math.sin(bulletData.angle) * 15,
                    dmg: dmgMap[p.weapon] || 10, r: 5, color: p.weapon === 2 ? "#00ffff" : "#ffd700"
                });
            }
        }
    });

    socket.on("sendRoomChatMessage", (data) => {
        const rId = socket.roomId;
        if (rId && rooms[rId]) {
            const p = rooms[rId].players[socket.id];
            if (p && data.text) {
                io.to(rId).emit("receiveRoomChatMessage", {
                    senderId: socket.id, nickname: p.nickname, text: data.text
                });
            }
        }
    });

    socket.on("leaveQueue", () => { cleanFromAllQueues(socket.id); });

    socket.on("disconnect", () => {
        cleanFromAllQueues(socket.id);
        const rId = socket.roomId;
        if (rId && rooms[rId]) {
            delete rooms[rId].players[socket.id];
            if (Object.keys(rooms[rId].players).length === 0) delete rooms[rId];
        }
    });
});

// ???? ?????? ????????? ????????? ????????? ??? ???????
setInterval(() => {
    for (let rId in rooms) {
        const room = rooms[rId];
        const activePlayers = Object.values(room.players);

        for (let i = room.bullets.length - 1; i >= 0; i--) {
            const b = room.bullets[i];
            b.x += b.vx; b.y += b.vy;

            if (checkCollision(b.x, b.y, b.r, room.doorsState)) {
                room.bullets.splice(i, 1); continue;
            }

            let hit = false;
            for (let p of activePlayers) {
                if (p.id !== b.owner && p.hp > 0) {
                    if (Math.hypot(p.x - b.x, p.y - b.y) < p.r + b.r) {
                        const armorsPlat = [0, 2, 5];
                        p.hp = Math.max(0, p.hp - Math.max(2, b.dmg - (armorsPlat[p.armor] || 0)));
                        room.bullets.splice(i, 1); hit = true; break;
                    }
                }
            }
            if (hit) continue;
        }
        io.to(room.id).emit("gameUpdate", { players: room.players, bullets: room.bullets, doorsState: room.doorsState });
    }
}, 33);

const PORT = process.env.PORT || 3000;
http.listen(PORT, "0.0.0.0", () => {
    console.log(`[TACTICAL SERVER ACTIVE ON PORT ${PORT}]`);
});