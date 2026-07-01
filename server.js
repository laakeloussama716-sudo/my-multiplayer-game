const express = require("express");
const app = express();
const path = require("path");
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
    cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname)));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

let players = {};
let registeredNames = {}; 

io.on("connection", (socket) => {
    console.log("Player connected: " + socket.id);

    socket.on("newPlayer", (data) => {
        const { x, y, angle, nickname, email } = data;
        
        let nameExists = Object.values(registeredNames).includes(nickname);
        let ownsName = registeredNames[email] === nickname;

        if (nameExists && !ownsName) {
            socket.emit("nameRejected", "This nickname is already taken by another account!");
            return;
        }

        registeredNames[email] = nickname;

        players[socket.id] = {
            id: socket.id,
            x: x,
            y: y,
            angle: angle,
            nickname: nickname,
            email: email,
            hp: 100
        };

        socket.emit("nameAccepted");
        io.emit("stateUpdate", players);
    });

    socket.on("move", (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            players[socket.id].angle = data.angle;
            io.emit("stateUpdate", players);
        }
    });

    socket.on("shoot", (bulletData) => {
        socket.broadcast.emit("bulletFired", bulletData);
    });

    socket.on("playerDamage", (data) => {
        if (players[data.id]) {
            players[data.id].hp = Math.max(0, players[data.id].hp - data.damage);
            io.emit("stateUpdate", players);
        }
    });

    socket.on("disconnect", () => {
        console.log("Player disconnected: " + socket.id);
        delete players[socket.id];
        io.emit("stateUpdate", players);
    });
});

const PORT = process.env.PORT || 10000;
http.listen(PORT, () => {
    console.log("Server running on port: " + PORT);
});