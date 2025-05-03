const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { randomUUID } = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const chats = {};        // { idSalon: [socketId1, socketId2] }
const clients = {};      // { socketId: idSalon }

io.on('connection', (socket) => {
    console.log(`Connexion de ${socket.id}`);

    socket.on('createChat', () => {
        const idSalon = randomUUID().slice(0, 6);
        chats[idSalon] = [socket.id];
        clients[socket.id] = idSalon;
        socket.emit('chatCreated', idSalon);
    });

    socket.on('joinChat', (idSalon) => {
        if (!chats[idSalon]) {
            socket.emit('errorMessage', 'Ce salon n’existe pas.');
            return;
        }
        if (chats[idSalon].length >= 2) {
            socket.emit('errorMessage', 'Ce salon est déjà plein.');
            return;
        }
        chats[idSalon].push(socket.id);
        clients[socket.id] = idSalon;
        socket.emit('chatCreated', idSalon);
    });

    socket.on('message', (texte) => {
        const idSalon = clients[socket.id];
        if (idSalon) {
            chats[idSalon].forEach(id => {
                io.to(id).emit('message', {
                    texte,
                    expediteur: socket.id
                });
            });
        }
    });

    socket.on('image', (base64) => {
        const idSalon = clients[socket.id];
        if (idSalon) {
            chats[idSalon].forEach(id => {
                io.to(id).emit('image', {
                    base64,
                    expediteur: socket.id
                });
            });
        }
    });

    socket.on('disconnect', () => {
        const idSalon = clients[socket.id];
        if (idSalon) {
            chats[idSalon] = chats[idSalon].filter(id => id !== socket.id);
            delete clients[socket.id];
            if (chats[idSalon].length === 0) {
                delete chats[idSalon];
            }
        }
    });
});

server.listen(3000, () => {
    console.log('Serveur démarré sur http://localhost:3000');
});

