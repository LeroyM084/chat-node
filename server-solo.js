// On dit ce qu'on a besoin de require 
const express = require('express');
const http = require('http');

// On utilisera uniquement webSocket.Server donc on extrait que ça de WebSocket.io
// socket.io est une librairie node permettant de faire des communications en direct 
const { Server } = require('socket.io');

// On importe ensuite de quoi générer des random UUID
const { randomUUID } = require('crypto');

// On initialise express et on crée un serveur http
const app = express();
const server = http.createServer(app);

// On attache ensuite notre socket.io au serveur http
const io = new Server(server);

// En mémoire (non constante), on stocke les chats actifs { idChat: [client1, client2] }
const chats = {};

// On dit à express d'utiliser les trucs de /public pour le front
app.use(express.static('public'));

// Quand un client se connecte à Socket.io (un chat)
io.on('connection', (socket) => {
    let currentChatId = null;

    // Création d'un nouveau chat
    socket.on('createChat', () => {
        const chatID = randomUUID().slice(0, 6); // Génère un chatID aléatoire de 6 caractères
        // On enregistre le nouveau chat, et le client créateur comme premier client 
        chats[chatID] = [socket.id];
        socket.join(chatID);
        socket.emit('chatCreated', chatID); // On envoie l'id du chat pour pouvoir l'afficher
    });

    // REJOINDRE UN CHAT EXISTANT
    socket.on('joinChat', (chatId) => {
        if (chats[chatId] && chats[chatId].length < 2) { // Si le chat existe, et qu'il y a moins de deux personnes
            chats[chatId].push(socket.id); // On rentre le deuxième socket (client) dans le chat
            socket.join(chatId);
            currentChatId = chatId;
            io.to(chatId).emit('message', 'New user joined');
        } else {
            socket.emit('errorMessage', 'Clé invalide ou salon plein'); // On prévient le client que le salon est injoignable
        }
    });

    // RECEPTION DES MESSAGES
    socket.on('message', (msg) => {
        if (currentChatId) { // On vérifie que le client est bien dans un chat
            io.to(currentChatId).emit('message', msg); // On envoie le message à tous les autres clients dans le même chat
        }
    });

    // Déconnexion d'un utilisateur
    socket.on('disconnect', () => {
        if (currentChatId) { // Si l'utilisateur est dans un chat
            const sockets = chats[currentChatId] || []; // On récupère tous les autres sockets du chat ( || [] permet d'éviter les erreurs d'undefined)
            chats[currentChatId] = sockets.filter(id => id !== socket.id); // On retire le client du chat en comparant chaque id du chat avec l'id du client actuel
            if (chats[currentChatId].length === 0) { // On supprime carrément le chat si il est vide
                delete chats[currentChatId];
            }
        }
    });
});

// Démarrer le serveur sur le port 3000
server.listen(3000, () => {
    console.log('Server is running on port 3000');
});

