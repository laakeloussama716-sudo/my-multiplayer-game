const express = require("express");
const app = express();
const path = require("path"); // ????? ??????? ?? ?????? ???????
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
    cors: { origin: "*" }
});

// ?? ??? ??????? ???? ????? ????? ??????? (??? index.html) ????????
app.use(express.static(path.join(__dirname)));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

let players = {};
let registeredNames = {}; 

io.on("connection", (socket) => {
    console.log("???? ???? ??????: " + socket.id);

    socket.on("newPlayer", (data) => {
        const { x, y, angle, nickname, email } = data;
        
        let nameExists = Object.values(registeredNames).includes(nickname);
        let ownsName = registeredNames[email] === nickname;

        if (nameExists && !ownsName) {
            socket.emit("nameRejected", "??? ????? ????? ?????? ????? ???!");
            return;
        }

        registeredNames[email] = nickname;

        players[socket.id] = {
            id: socket.id,
            x: x,
            y: y,
            angle: angle,
            nickname: nickname,
            email: email
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

    socket.on("disconnect", () => {
        console.log("???? ???? ???????: " + socket.id);
        delete players[socket.id];
        io.emit("stateUpdate", players);
    });
});

const PORT = process.env.PORT || 10000;
http.listen(PORT, () => {
    console.log("??????? ???? ????? ??? ??????: " + PORT);
});