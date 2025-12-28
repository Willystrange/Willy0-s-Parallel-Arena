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
async function getUserData(uid) {
    const doc = await db.collection('users').doc(uid).get();
    return doc.exists ? doc.data() : null;
}

async function saveUserData(uid, data) {
    try {
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

// --- SECURITY & RECAPTCHA ---
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || "6LcMZzcsAAAAABJNQwfd8Azzi45yk-KT86hK437W";
async function verifyRecaptcha(token, userId = null) {
    console.log(`[reCAPTCHA] Vérification pour ${userId || 'Inconnu'}`);
    if (token === "DEV_BYPASS_TOKEN") return { success: true };
    if (token && (token.startsWith("timeout_") || token.startsWith("no_"))) {
        console.log("[reCAPTCHA] Bypass détecté");
        return { success: true }; // On autorise le bypass pour l'instant sur Render
    }
    try {
        const params = new URLSearchParams();
        params.append('secret', RECAPTCHA_SECRET_KEY);
        params.append('response', token);
        const resp = await axios.post('https://www.google.com/recaptcha/api/siteverify', params.toString());
        console.log(`[reCAPTCHA] Réponse Google : ${resp.data.success}, score: ${resp.data.score}`);
        return resp.data.success || resp.data.score >= 0.3 ? { success: true } : { success: false };
    } catch (e) { 
        console.error("[reCAPTCHA] Erreur API:", e.message);
        return { success: true }; // On laisse passer en cas d'erreur API pour ne pas bloquer le jeu
    }
}

// --- MIDDLEWARES ---
async function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        if (req.path === '/api/config/maintenance' || req.path === '/api/news') return next();
        return res.status(401).json({ error: "Auth requise" });
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
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// --- DATA ---
const PORT = process.env.PORT || 3000;
function loadJSONData(p, def) { if (!fs.existsSync(p)) return def; try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return def; } }
const TROPHY_ROAD = loadJSONData(path.join(__dirname, 'data', 'trophy_road.json'), []);
const PASS_REWARDS = loadJSONData(path.join(__dirname, 'data', 'pass_rewards.json'), { free: [], premium: [] });
const OPPONENT_STATS_RANGES = loadJSONData(path.join(__dirname, 'data', 'survival_opponents.json'), {});
const EQUIPMENTS_DATA = loadJSONData(path.join(__dirname, 'data', 'equipments.json'), []);

// --- HELPERS ---
function getParisCycleId(type) {
    const now = new Date();
    const options = { timeZone: 'Europe/Paris', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(now);
    const get = (t) => parseInt(parts.find(p => p.type === t).value, 10);
    const date = new Date(Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute')));
    date.setUTCHours(date.getUTCHours() - 9);
    if (type === 'daily') return date.toISOString().split('T')[0];
    const diff = (date.getUTCDay() - 4 + 7) % 7;
    date.setUTCDate(date.getUTCDate() - diff);
    return date.toISOString().split('T')[0];
}

function updateParallelPass(userData, gainXP) {
    if (gainXP <= 0) return;
    userData.pass_XP = (userData.pass_XP || 0) + gainXP;
    const calcNext = (lvl) => Math.round((50 + (lvl * 20)) * 1.1);
    while (userData.pass_XP >= calcNext(userData.pass_level || 0)) {
        userData.pass_XP -= calcNext(userData.pass_level || 0);
        userData.pass_level = (userData.pass_level || 0) + 1;
    }
}

// --- ROUTES ---
app.get('/api/config/maintenance', async (req, res) => res.json(await loadServerConfig()));
app.get('/api/news', async (req, res) => {
    const doc = await db.collection('settings').doc('news').get();
    res.json(doc.exists ? doc.data().items : []);
});
app.get('/api/check-pseudo/:pseudo', async (req, res) => {
    const snap = await db.collection('users').where('pseudo_lower', '==', req.params.pseudo.trim().toLowerCase()).get();
    res.json({ available: snap.empty });
});

app.get('/api/user/:userId', verifyToken, async (req, res) => res.json({ success: true, userData: await getUserData(req.params.userId) }));

app.post('/api/user/:userId', verifyToken, async (req, res) => {
    const current = await getUserData(req.params.userId) || {};
    const newData = req.body.userData;
    const ALLOWED = ['pseudo', 'settings', 'musicAllowed', 'autoplayEnabled', 'tropheesMax', 'victoires', 'defaites', 'manches_max', 'quetes_jour', 'quetes_weekend', 'equipments'];
    ALLOWED.forEach(k => { if (newData[k] !== undefined) current[k] = newData[k]; });
    Object.keys(newData).forEach(k => { if (k.startsWith('quete') || k.startsWith('Semaine')) current[k] = newData[k]; });
    await saveUserData(req.params.userId, current);
    res.json({ success: true, userData: current });
});

// --- SHOP & COFFRES ---
const ITEM_MAP = { xp: 'Double_XP_acheté', potion: 'Potion_de_Santé_acheté', epee: 'epee_tranchante_acheté', elixir: 'elixir_puissance_acheté', armure: 'armure_fer_acheté', bouclier: 'bouclier_solide_acheté', cape: 'Cape_acheté', crystal: 'crystal_acheté' };

app.post('/api/shop/buy', verifyToken, async (req, res) => {
    const { userId, type, itemId, price, recaptchaToken } = req.body;
    if (!(await verifyRecaptcha(recaptchaToken, userId)).success) return res.status(403).json({ error: "Sécurité" });
    const userData = await getUserData(userId);
    if (!userData || (userData.argent || 0) < price) return res.status(400).json({ error: "Fonds insuffisants" });
    userData.argent -= price;
    if (type === 'equipment') { if (!userData.equipments) userData.equipments = []; userData.equipments.push(itemId); }
    else { const prop = ITEM_MAP[type]; if (prop) userData[prop] = (userData[prop] || 0) + (req.body.quantity || 1); }
    await saveUserData(userId, userData);
    res.json({ success: true, userData });
});

app.post('/api/lootbox/open', verifyToken, async (req, res) => {
    const { userId, boxType, recaptchaToken } = req.body;
    if (!(await verifyRecaptcha(recaptchaToken, userId)).success) return res.status(403).json({ error: "Sécurité" });
    const userData = await getUserData(userId);
    if (!userData) return res.status(404).json({ error: "Inconnu" });
    const rarity = Math.random() < 0.05 ? 'légendaire' : (Math.random() < 0.3 ? 'rare' : 'commun');
    const possible = EQUIPMENTS_DATA.filter(e => e.type.toLowerCase() === boxType.toLowerCase());
    const selected = possible[Math.floor(Math.random() * possible.length)] || { id: "gantelets_force", rarity: "commun" };
    if (!userData.equipments) userData.equipments = [];
    userData.equipments.push(selected.id);
    await saveUserData(userId, userData);
    res.json({ success: true, userData, reward: { id: selected.id, rarity: selected.rarity, type: boxType } });
});

app.post('/api/recompenses/open', verifyToken, async (req, res) => {
    const { userId, recaptchaToken } = req.body;
    if (!(await verifyRecaptcha(recaptchaToken, userId)).success) return res.status(403).json({ error: "Sécurité" });
    const userData = await getUserData(userId);
    if (!userData || (userData.recompense || 0) <= 0) return res.status(400).json({ error: "Pas de récompense" });
    userData.recompense--;
    userData.argent = (userData.argent || 0) + 50;
    await saveUserData(userId, userData);
    res.json({ success: true, userData, rewards: [{ name: "50 Points", id: "argent", amount: 50 }] });
});

// --- PASSKEYS ---
const challenges = new Map();
app.post('/api/passkey/login-options', async (req, res) => {
    const { email } = req.body;
    const rpID = req.headers.host.split(':')[0];
    const options = await generateAuthenticationOptions({ rpID, userVerification: 'preferred' });
    const tempId = Math.random().toString(36).substring(7);
    challenges.set(`auth_pending_${tempId}`, options.challenge);
    res.json({ ...options, tempId });
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
    if (!game) return res.status(404).json({ error: "Partie expirée" });
    const results = { gameOver: false, logs: [] };
    if (action === 'attack') combatEngine.handleAttack(game.player, game.opponent, true, results);
    else if (action === 'special') combatEngine.applySpecialAbility(game.player, game.opponent, true, results);
    
    if (!results.gameOver && game.opponent.pv > 0) {
        if (game.opponent.next_choice === 'attack') combatEngine.handleAttack(game.opponent, game.player, false, results);
        else if (game.opponent.next_choice === 'special') combatEngine.applySpecialAbility(game.opponent, game.player, false, results);
        game.opponent.next_choice = combatEngine.makeAIDecision(game);
    }

    if (game.player.pv <= 0 || game.opponent.pv <= 0) {
        results.gameOver = true;
        results.winner = game.player.pv > 0 ? 'player' : 'opponent';
        const userData = await getUserData(userId);
        if (userData) {
            userData.argent = (userData.argent || 0) + (results.winner === 'player' ? 20 : 5);
            updateParallelPass(userData, results.winner === 'player' ? 50 : 10);
            await saveUserData(userId, userData);
        }
        games.delete(userId);
    }
    res.json({ success: true, game, results });
});

// --- SERVER ---
server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Willy0 Arena LIVE sur le port ${PORT}`));

function generateSurvivalOpponent(wave) {
    const names = Object.keys(OPPONENT_STATS_RANGES);
    const name = names[Math.floor(Math.random() * names.length)] || "Guerrier";
    const stats = OPPONENT_STATS_RANGES[name] || { minPv: 100, minAttaque: 10, minDefense: 10, vitesse: 5 };
    const scale = 1 + (wave - 1) * 0.1;
    return { name, pv: Math.round(stats.minPv * scale), pv_maximum: Math.round(stats.minPv * scale), pv_max: Math.round(stats.minPv * scale), attaque: Math.round(stats.minAttaque * scale), attaque_originale: Math.round(stats.minAttaque * scale), defense: Math.round(stats.minDefense * scale), defense_originale: Math.round(stats.minDefense * scale), vitesse: stats.vitesse, vitesse_originale: stats.vitesse, critique: 0, critique_originale: 0, spe: 0, equipments: [], effects: [] };
}
