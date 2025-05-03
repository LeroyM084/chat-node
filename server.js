// On importe Express pour gérer les routes HTTP
const express = require('express');

// On utilise http pour créer un serveur compatible avec Socket.io
const http = require('http');

// On importe le serveur WebSocket de Socket.io
const { Server } = require('socket.io');

// On importe un générateur d'identifiant unique depuis Node.js natif
const { randomUUID } = require('crypto');

// Initialisation de l'application Express
const app = express();

// On crée un serveur HTTP basé sur l'application Express
const server = http.createServer(app);

// On attache Socket.io au serveur HTTP
const io = new Server(server);

// En mémoire, on stocke les chats actifs sous forme : { idChat: [idSocket1, idSocket2] }
const chats = {};

// On indique à Express de servir les fichiers du dossier 'public' (HTML, CSS, JS frontend)
app.use(express.static('public'));

// Quand un client se connecte à Socket.io
io.on('connection', (socket) => {
  // Cette variable gardera l'ID du chat auquel ce socket participe
  let currentChatId = null;

  // --- Création d'un nouveau chat ---
  socket.on('createChat', () => {
    // On génère un ID aléatoire court (6 caractères)
    const chatId = randomUUID().slice(0, 6);

    // On enregistre ce chat avec ce socket comme premier membre
    chats[chatId] = [socket.id];

    // Le socket rejoint une "room" nommée selon l'ID du chat
    socket.join(chatId);

    // On sauvegarde l'ID du chat dans le contexte de ce socket
    currentChatId = chatId;

    // On envoie l'ID du chat au client pour qu'il l'affiche
    socket.emit('chatCreated', chatId);
  });

  // --- Rejoindre un chat existant ---
  socket.on('joinChat', (chatId) => {
    // Si le chat existe et qu'il n'a qu'une personne (max 2 ici)
    if (chats[chatId] && chats[chatId].length < 2) {
      // On ajoute le second utilisateur à la liste
      chats[chatId].push(socket.id);

      // Le socket rejoint la même room
      socket.join(chatId);

      // On met à jour l'ID du chat actuel pour ce socket
      currentChatId = chatId;

      // On notifie le client qu'il a rejoint le chat
      socket.emit('chatJoined', chatId);

      // Et on envoie un message à tous les membres pour indiquer que quelqu’un a rejoint
      io.to(chatId).emit('message', '💬 Un utilisateur a rejoint le chat');
    } else {
      // Sinon, on renvoie une erreur au client (chat non trouvé ou complet)
      socket.emit('errorMessage', 'Clé invalide ou chat complet');
    }
  });

  // --- Réception de message depuis un client ---
  socket.on('message', (msg) => {
    // Si ce socket est dans un chat, on retransmet le message à tous les membres du chat
    if (currentChatId) {
      io.to(currentChatId).emit('message', msg);
    }
  });

  // --- Déconnexion d'un utilisateur ---
  socket.on('disconnect', () => {
    if (currentChatId) {
      // On récupère tous les sockets du chat
      const sockets = chats[currentChatId] || [];

      // On retire le socket actuel de la liste
      chats[currentChatId] = sockets.filter(id => id !== socket.id);

      // Si la liste est vide, on supprime complètement le chat
      if (chats[currentChatId].length === 0) {
        delete chats[currentChatId];
      }
    }
  });
});

// On lance le serveur HTTP sur le port 3000
server.listen(3000, () => {
  console.log('Serveur sur http://localhost:3000');
});

