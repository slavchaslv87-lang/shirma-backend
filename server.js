const express = require('express');
const app = express();
const http = require('http').createServer(app);
const path = require('path');
const io = require('socket.io')(http, {
    cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname, 'public')));

let waitingUsers = [];

io.on('connection', (socket) => {
    console.log(`Пользователь подключился: ${socket.id}`);

    socket.on('search-match', () => {
        if (waitingUsers.includes(socket.id)) return;

        if (waitingUsers.length > 0) {
            const peerId = waitingUsers.shift();
            const roomId = `room_${socket.id}_${peerId}`;

            socket.join(roomId);
            io.sockets.sockets.get(peerId)?.join(roomId);

            socket.emit('match-found', { roomId, initiator: true, peerId });
            io.to(peerId).emit('match-found', { roomId, initiator: false, peerId: socket.id });
            
            console.log(`Пара создана в комнате: ${roomId}`);
        } else {
            waitingUsers.push(socket.id);
            socket.emit('waiting', 'Ищем свободного собеседника...');
            console.log(`Пользователь ${socket.id} встал в очередь`);
        }
    });

    socket.on('webrtc-signal', (data) => {
        socket.to(data.roomId).emit('webrtc-signal', {
            signal: data.signal,
            sender: socket.id
        });
    });

    socket.on('game-action-done', (data) => {
        socket.to(data.roomId).emit('peer-game-done');
    });

    socket.on('disconnect', () => {
        console.log(`Пользователь отключился: ${socket.id}`);
        waitingUsers = waitingUsers.filter(id => id !== socket.id);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`Сервер p2p-рулетки запущен на порту ${PORT}`);
});
