const express = require("express");
const app = express();
const path = require("path");
const http = require("http").createServer(app);
const io = require("socket.io")(http, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname)));
app.get("/", (req, res) => { res.sendFile(path.join(__dirname, "index.html")); });

let players = {};
let rooms = {}; // ????? ????? ??????? ??????? ????????

io.on("connection", (socket) => {
    console.log("User connected: " + socket.id);

    socket.on("joinGame", (data) => {
        const { nickname, email, mode, gear } = data;
        
        players[socket.id] = {
            id: socket.id,
            x: Math.random() * 1000 + 500,
            y: Math.random() * 1000 + 500,
            angle: 0,
            nickname: nickname,
            email: email,
            hp: 100 + (gear.armor * 25), // ????? ???? ??? ?????
            maxHp: 100 + (gear.armor * 25),
            gear: gear,
            mode: mode,
            room: null
        };

        // ???? ????? ???????? ??? ????? ??? ????? ???????
        if (mode === "1v1") {
            let joinedRoom = false;
            for (let rId in rooms) {
                if (rooms[rId].mode === "1v1" && rooms[rId].players.length < 2) {
                    rooms[rId].players.push(socket.id);
                    players[socket.id].room = rId;
                    joinedRoom = true;
                    break;
                }
            }
            if (!joinedRoom) {
                let rId = "room_1v1_" + socket.id;
                rooms[rId] = { mode: "1v1", players: [socket.id] };
                players[socket.id].room = rId;
            }
        } else if (mode === "br") {
            let joinedRoom = false;
            for (let rId in rooms) {
                if (rooms[rId].mode === "br" && rooms[rId].players.length < 30) {
                    rooms[rId].players.push(socket.id);
                    players[socket.id].room = rId;
                    joinedRoom = true;
                    break;
                }
            }
            if (!joinedRoom) {
                let rId = "room_br_" + socket.id;
                rooms[rId] = { mode: "br", players: [socket.id] };
                players[socket.id].room = rId;
            }
        } else if (mode === "coop") {
            let joinedRoom = false;
            for (let rId in rooms) {
                if (rooms[rId].mode === "coop" && rooms[rId].players.length < 2) {
                    rooms[rId].players.push(socket.id);
                    players[socket.id].room = rId;
                    joinedRoom = true;
                    break;
                }
            }
            if (!joinedRoom) {
                let rId = "room_coop_" + socket.id;
                rooms[rId] = { mode: "coop", players: [socket.id], goldShared: 0, level: 1 };
                players[socket.id].room = rId;
            }
        }

        socket.join(players[socket.id].room);
        socket.emit("joinedRoomSuccess", { roomId: players[socket.id].room });
        sendRoomState(players[socket.id].room);
    });

    socket.on("move", (data) => {
        if (players[socket.id] && players[socket.id].room) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            players[socket.id].angle = data.angle;
            sendRoomState(players[socket.id].room);
        }
    });

    socket.on("shoot", (bulletData) => {
        if (players[socket.id] && players[socket.id].room) {
            socket.to(players[socket.id].room).emit("bulletFired", bulletData);
        }
    });

    socket.on("coopGoldUpdate", (data) => {
        if (players[socket.id] && players[socket.id].room) {
            let rId = players[socket.id].room;
            if (rooms[rId]) {
                rooms[rId].goldShared += data.amount;
                io.to(rId).emit("coopGoldSynced", { goldShared: rooms[rId].goldShared });
            }
        }
    });

    socket.on("playerDamage", (data) => {
        let targetId = data.id;
        if (players[targetId] && players[targetId].room) {
            players[targetId].hp = Math.max(0, players[targetId].hp - data.damage);
            sendRoomState(players[targetId].room);
        }
    });

    socket.on("disconnect", () => {
        if (players[socket.id]) {
            let rId = players[socket.id].room;
            if (rId && rooms[rId]) {
                rooms[rId].players = rooms[rId].players.filter(id => id !== socket.id);
                if (rooms[rId].players.length === 0) delete rooms[rId];
                else sendRoomState(rId);
            }
            delete players[socket.id];
        }
        console.log("User disconnected: " + socket.id);
    });
});

function sendRoomState(roomId) {
    if (!rooms[roomId]) return;
    let roomPlayers = {};
    rooms[roomId].players.forEach(pId => {
        if (players[pId]) roomPlayers[pId] = players[pId];
    });
    io.to(roomId).emit("stateUpdate", roomPlayers);
}

const PORT = process.env.PORT || 10000;
http.listen(PORT, () => { console.log("Server running on port: " + PORT); });