const socket = io();
let monId = null;

const boutonCreer = document.getElementById('creerSalon');
const boutonRejoindre = document.getElementById('rejoindreSalon');
const inputCle = document.getElementById('cleSalon');
const formulaire = document.getElementById('formulaire');
const champMessage = document.getElementById('message');
const inputImage = document.getElementById('imageInput');
const zoneMessages = document.getElementById('messages');
const chatIdDisplay = document.getElementById('chatIdDisplay');

socket.on('connect', () => {
    monId = socket.id;
});

boutonCreer.addEventListener('click', () => {
    socket.emit('createChat');
});

socket.on('chatCreated', (chatId) => {
    chatIdDisplay.textContent = `Clé du salon : ${chatId}`;
});

boutonRejoindre.addEventListener('click', () => {
    const cle = inputCle.value.trim();
    if (cle) {
        socket.emit('joinChat', cle);
        chatIdDisplay.textContent = `Clé du salon : ${cle}`;
    }
});

socket.on('errorMessage', (msg) => {
    alert(msg);
});

socket.on('message', ({ texte, expediteur }) => {
    const div = document.createElement('div');
    div.classList.add('message');
    div.classList.add(expediteur === monId ? 'moi' : 'lui');
    div.textContent = texte;
    zoneMessages.appendChild(div);
    zoneMessages.scrollTop = zoneMessages.scrollHeight;
});

socket.on('image', ({ base64, expediteur }) => {
    const div = document.createElement('div');
    div.classList.add('message');
    div.classList.add(expediteur === monId ? 'moi' : 'lui');

    const img = document.createElement('img');
    img.src = base64;
    div.appendChild(img);

    zoneMessages.appendChild(div);
    zoneMessages.scrollTop = zoneMessages.scrollHeight;
});

formulaire.addEventListener('submit', (e) => {
    e.preventDefault();

    const texte = champMessage.value.trim();
    const fichier = inputImage.files[0];

    if (texte) {
        socket.emit('message', texte);
        champMessage.value = '';
    }

    if (fichier) {
        const reader = new FileReader();
        reader.onload = () => {
            socket.emit('image', reader.result);
        };
        reader.readAsDataURL(fichier);
        inputImage.value = '';
    }
});

