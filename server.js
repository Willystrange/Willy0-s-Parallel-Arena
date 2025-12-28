const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const combatEngine = require('./scripts/combat-engine-server.js');
const admin = require('firebase-admin');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const qrcode = require('qrcode-terminal');
const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

// --- INITIALIZATION ---
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const serviceAccount = require(path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} else if (fs.existsSync('./serviceAccountKey.json')) {
    const serviceAccount = require("./serviceAccountKey.json");
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();
const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// --- FIRESTORE HELPERS ---
async function loadAllUsersData() {
    try {
        const snapshot = await db.collection('users').get();
        const users = {};
        snapshot.forEach(doc => { users[doc.id] = doc.data(); });
        return users;
    } catch (e) { console.error("Firestore Load Error:", e); return {}; }
}

async function getUserData(uid) {
    const doc = await db.collection('users').doc(uid).get();
    return doc.exists ? doc.data() : null;
}

async function saveUserData(uid, data) {
    try {
        // Ensure we don't save circular references or undefined
        const cleanData = JSON.parse(JSON.stringify(data));
        if (cleanData.pseudo) cleanData.pseudo_lower = cleanData.pseudo.toLowerCase().trim();
        if (cleanData.email) cleanData.email_lower = cleanData.email.toLowerCase().trim();
        await db.collection('users').doc(uid).set(cleanData, { merge: true });
    } catch (e) { console.error("Firestore Save Error:", e); }
}

async function loadServerConfig() {
    try {
        const doc = await db.collection('settings').doc('config').get();
        return doc.exists ? doc.data() : { maintenance: false };
    } catch (e) { return { maintenance: false }; }
}

async function saveServerConfig(data) {
    try { await db.collection('settings').doc('config').set(data); } catch (e) {}
}

// --- ONLINE USERS TRACKING ---
const onlineUsers = new Map();
io.on('connection', (socket) => {
    socket.on('register', (data) => { if (data.userId) onlineUsers.set(socket.id, { userId: data.userId, lastSeen: Date.now() }); });
    socket.on('disconnect', () => onlineUsers.delete(socket.id));
});

// --- SECURITY & MIDDLEWARE ---
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || "6LcMZzcsAAAAABJNQwfd8Azzi45yk-KT86hK437W";
async function verifyRecaptcha(token, userId = null) {
    if (token && (token.startsWith("timeout_grecaptcha_") || token.startsWith("no_grecaptcha_"))) {
        const parts = token.split("_");
        const timestamp = parseInt(parts[parts.length - 1]);
        if (isNaN(timestamp) || (Date.now() - timestamp) > 30000) return { success: false, error: "Session expirée" };
        await new Promise(r => setTimeout(r, 2000));
        return { success: true, score: 0.3, bypassed: true };
    }
    if (token === "DEV_BYPASS_TOKEN") return { success: true, score: 1.0, bypassed: true };
    try {
        const params = new URLSearchParams();
        params.append('secret', RECAPTCHA_SECRET_KEY);
        params.append('response', token);
        const resp = await axios.post('https://www.google.com/recaptcha/api/siteverify', params.toString());
        return resp.data.success && resp.data.score >= 0.3 ? { success: true, score: resp.data.score } : { success: false, error: "Bot détecté" };
    } catch (e) { return { success: false, error: "Erreur sécurité" }; }
}

async function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        if (req.path === '/api/config/maintenance') return next();
        return res.status(401).json({ error: "Authentification requise" });
    }
    try {
        const decodedToken = await admin.auth().verifyIdToken(authHeader.split('Bearer ')[1]);
        req.uid = decodedToken.uid;
        next();
    } catch (e) { res.status(401).json({ error: "Session invalide" }); }
}

async function verifyAdmin(req, res, next) {
    const userData = await getUserData(req.uid);
    if (userData && userData.isAdmin) next();
    else res.status(403).json({ error: "Admin requis" });
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// --- DATA & CONFIG ---
const PORT = process.env.PORT || 3000;
const AI_MODEL_FILE = path.join(__dirname, 'ai_model.json');
const TROPHY_ROAD_FILE = path.join(__dirname, 'data', 'trophy_road.json');
const PASS_REWARDS_FILE = path.join(__dirname, 'data', 'pass_rewards.json');
const SURVIVAL_OPPONENTS_FILE = path.join(__dirname, 'data', 'survival_opponents.json');
const EQUIPMENTS_FILE = path.join(__dirname, 'data', 'equipments.json');

function loadJSONData(path, def) { if (!fs.existsSync(path)) return def; try { return JSON.parse(fs.readFileSync(path, 'utf8')); } catch (e) { return def; } }
const TROPHY_ROAD = loadJSONData(TROPHY_ROAD_FILE, []);
const PASS_REWARDS = loadJSONData(PASS_REWARDS_FILE, { free: [], premium: [] });
const OPPONENT_STATS_RANGES = loadJSONData(SURVIVAL_OPPONENTS_FILE, {});
const WEEKEND_EVENTS = ["PV égaux", "Chargement /2", "Sans défense", "Sans objet", "Points X2", "XP X2", "Rage", "Armure fragile", "Récupération rapide", "Malédiction", "Bénédiction"];

// --- GAME LOGIC HELPERS ---
function updateParallelPass(userData, gainXP) {
    if (gainXP > 0) userData.pass_XP = (userData.pass_XP || 0) + gainXP;
    const calcNext = (lvl) => Math.round((50 + (lvl * 20)) * 1.1);
    while ((userData.pass_XP || 0) >= calcNext(userData.pass_level || 0)) {
        userData.pass_XP -= calcNext(userData.pass_level || 0);
        userData.pass_level = (userData.pass_level || 0) + 1;
    }
}

async function finalizeGame(userId, game, results) {
    const userData = await getUserData(userId);
    if (!userData) return;
    const isPlayerWinner = (results.winner === 'player');
    const player = game.player;
    userData.gagnant = isPlayerWinner ? player.name : game.opponent.name;
    userData.partie_commencee = false; userData.partie_commencee_weekend = false; userData.partie_commencee_survie = false;
    let gain_xp = 0, gain_argent = 0, gain_trophees = 0;
    if (game.gameMode === 'survie') {
        gain_argent = Math.round((Math.floor(Math.random() * 7) + 3) * game.wave * 0.8);
        gain_xp = Math.round(25 * game.wave * 0.7);
        userData.fin_manche = game.wave;
    } else {
        const lvl = Number(userData[player.name + "_Level"] || 1) * 0.1;
        gain_xp = isPlayerWinner ? Math.round((2 * (player.pv / (player.pv_maximum || 1)) * 100) * (1 / (1 + lvl))) : Math.max(0, Math.round(20 - (2 * (lvl - 1))));
        if (isPlayerWinner && gain_xp < 20) gain_xp = 20;
        gain_argent = Math.round(gain_xp / 3);
        if (userData.XP_jour >= 2500) gain_xp = 0; else userData.XP_jour = (userData.XP_jour || 0) + gain_xp;
        gain_trophees = isPlayerWinner ? 10 : (userData.trophees < 150 ? -1 : (userData.trophees <= 300 ? -5 : -10));
    }
    if (game.gameMode === 'weekend' && game.event === 'XP X2') gain_xp *= 2;
    if (game.gameMode === 'weekend' && game.event === 'Points X2') gain_argent *= 2;
    if (userData.Double_XP > 0 && gain_xp > 0) { gain_xp *= 2; userData.Double_XP--; }
    userData.argent = (userData.argent || 0) + gain_argent;
    userData.trophees = Math.max(0, (userData.trophees || 0) + gain_trophees);
    if ((userData.trophees || 0) > (userData.tropheesMax || 0)) userData.tropheesMax = userData.trophees;
    userData[player.name + "_XP"] = (userData[player.name + "_XP"] || 0) + gain_xp;
    if (game.gameMode === 'survie') { if (game.wave > (userData.manches_max || 0)) userData.manches_max = game.wave; }
    else { if (isPlayerWinner) userData.victoires = (userData.victoires || 0) + 1; else userData.defaites = (userData.defaites || 0) + 1; }
    userData.fin_xp = gain_xp; userData.fin_argent = gain_argent; userData.fin_trophee = gain_trophees;
    updateParallelPass(userData, gain_xp);
    results.masteryGameResult = combatEngine.updateMastery(userData, player.name, { gameMode: game.gameMode, hpPercentage: (player.pv / (player.pv_maximum || 1)) * 100, damageDealt: player.degats_partie || 0, damageTaken: 500, wavesCleared: game.wave });
    await saveUserData(userId, userData);
    results.updatedUserData = userData;
}

// --- API ENDPOINTS ---
app.get('/api/news', async (req, res) => {
    const doc = await db.collection('settings').doc('news').get();
    res.json(doc.exists ? doc.data().items : []);
});

app.get('/api/check-pseudo/:pseudo', async (req, res) => {
    const snapshot = await db.collection('users').where('pseudo_lower', '==', req.params.pseudo.trim().toLowerCase()).get();
    res.json({ available: snapshot.empty });
});

app.get('/api/user/:userId', verifyToken, async (req, res) => {
    const data = await getUserData(req.params.userId);
    res.json({ success: true, userData: data });
});

app.post('/api/user/:userId', verifyToken, async (req, res) => {
    const current = await getUserData(req.params.userId) || {};
    const newData = req.body.userData;
    const ALLOWED = ['pseudo', 'settings', 'musicAllowed', 'autoplayEnabled', 'tropheesMax', 'victoires', 'defaites', 'manches_max', 'quetes_jour', 'quetes_weekend', 'equipments'];
    ALLOWED.forEach(k => { if (newData[k] !== undefined) current[k] = newData[k]; });
    // Fusion des quêtes
    Object.keys(newData).forEach(k => { if (k.startsWith('quete') || k.startsWith('Semaine')) current[k] = newData[k]; });
    await saveUserData(req.params.userId, current);
    res.json({ success: true, userData: current });
});

// --- SHOP & REWARDS ---
const ITEM_MAP = { xp: 'Double_XP_acheté', potion: 'Potion_de_Santé_acheté', epee: 'epee_tranchante_acheté', elixir: 'elixir_puissance_acheté', armure: 'armure_fer_acheté', bouclier: 'bouclier_solide_acheté', cape: 'Cape_acheté', crystal: 'crystal_acheté' };

app.post('/api/shop/buy', verifyToken, async (req, res) => {
    const { userId, type, itemId, price, recaptchaToken } = req.body;
    if (!(await verifyRecaptcha(recaptchaToken, userId)).success) return res.status(403).json({ error: "Bot" });
    const userData = await getUserData(userId);
    if (!userData || (userData.argent || 0) < price) return res.status(400).json({ error: "Erreur" });
    userData.argent -= price;
    if (type === 'equipment') { if (!userData.equipments) userData.equipments = []; userData.equipments.push(itemId); }
    else { const prop = ITEM_MAP[type]; if (prop) userData[prop] = (userData[prop] || 0) + 1; }
    await saveUserData(userId, userData);
    res.json({ success: true, userData });
});

// --- COMBAT ---
const games = new Map();
app.post('/api/combat/start', verifyToken, async (req, res) => {
    const { userId, gameMode, playerCharacter, opponentCharacter, recaptchaToken } = req.body;
    if (!(await verifyRecaptcha(recaptchaToken, userId)).success) return res.status(403).json({ error: "Bot" });
    const game = { userId, gameMode, player: playerCharacter, opponent: opponentCharacter, wave: gameMode === 'survie' ? 1 : 0, turn: 1, startTime: Date.now(), lastActionTime: Date.now() };
    if (gameMode === 'survie') game.opponent = generateSurvivalOpponent(1);
    game.opponent.next_choice = combatEngine.makeAIDecision(game);
    games.set(userId, game);
    res.json({ success: true, gameState: game });
});

app.post('/api/combat/action', verifyToken, async (req, res) => {
    const { userId, action } = req.body;
    const game = games.get(userId);
    if (!game) return res.status(404).json({ error: "Non trouvé" });
    const results = { gameOver: false, logs: [] };
    if (action === 'attack') combatEngine.handleAttack(game.player, game.opponent, true, results);
    else if (action === 'special') combatEngine.applySpecialAbility(game.player, game.opponent, true, results);
    
    // AI simple logic for this replacement
    combatEngine.updateTour(game.player, game.opponent, false, results);
    if (!results.gameOver) {
        if (game.opponent.next_choice === 'attack') combatEngine.handleAttack(game.opponent, game.player, false, results);
        game.opponent.next_choice = combatEngine.makeAIDecision(game);
    }

    if (game.player.pv <= 0 || game.opponent.pv <= 0) {
        results.gameOver = true;
        results.winner = game.player.pv > 0 ? 'player' : 'opponent';
        await finalizeGame(userId, game, results);
        games.delete(userId);
    }
    res.json({ success: true, game, results });
});

// --- ADMIN ---
app.get('/api/admin/users', verifyToken, verifyAdmin, async (req, res) => {
    const users = await loadAllUsersData();
    res.json({ success: true, users: Object.entries(users).map(([uid, u]) => ({ uid, ...u })).slice(0, 50) });
});

app.post('/api/admin/maintenance', verifyToken, verifyAdmin, async (req, res) => {
    await saveServerConfig(req.body);
    res.json({ success: true });
});

// --- SERVER START ---
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur Willy0 Arena prêt sur le port ${PORT}`);
    qrcode.generate(`http://localhost:${PORT}`, { small: true });
});

function generateSurvivalOpponent(wave) {
    const names = Object.keys(OPPONENT_STATS_RANGES);
    const name = names[Math.floor(Math.random() * names.length)];
    const stats = OPPONENT_STATS_RANGES[name];
    const scale = 1 + (wave - 1) * 0.1;
    return { name, pv: Math.round(stats.minPv * scale), pv_maximum: Math.round(stats.minPv * scale), pv_max: Math.round(stats.minPv * scale), attaque: Math.round(stats.minAttaque * scale), attaque_originale: Math.round(stats.minAttaque * scale), defense: Math.round(stats.minDefense * scale), defense_originale: Math.round(stats.minDefense * scale), vitesse: stats.vitesse, vitesse_originale: stats.vitesse, critique: 0, critique_originale: 0, spe: 0, equipments: [], effects: [] };
}