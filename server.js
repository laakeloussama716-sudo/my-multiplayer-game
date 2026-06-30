const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*" }
});
const cors = require('cors');

app.use(cors());

// ??? ?? ????? ?????? ?????? ???? ?????? ????? ?????? ?????? ????????
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

let players = {};

io.on('connection', (socket) => {
    console.log('Joueur connecté: ' + socket.id);

    socket.on('newPlayer', (data) => {
        players[socket.id] = data;
        io.emit('stateUpdate', players);
    });

    socket.on('move', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            players[socket.id].angle = data.angle;
            io.emit('stateUpdate', players);
        }
    });

    socket.on('shoot', (data) => {
        socket.broadcast.emit('bulletFired', data);
    });

    socket.on('disconnect', () => {
        console.log('Joueur déconnecté: ' + socket.id);
        delete players[socket.id];
        io.emit('stateUpdate', players);
    });
});

http.listen(3000, () => {
    console.log('Server running on port 3000...');
});