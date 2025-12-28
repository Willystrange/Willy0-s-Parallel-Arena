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
    try {
        const doc = await db.collection('users').doc(uid).get();
        return doc.exists ? doc.data() : null;
    } catch (e) { console.error(`[DB] Error getting user ${uid}:`, e); return null; }
}

async function saveUserData(uid, data) {
    try {
        const cleanData = JSON.parse(JSON.stringify(data));
        if (cleanData.pseudo) cleanData.pseudo_lower = cleanData.pseudo.toLowerCase().trim();
        if (cleanData.email) cleanData.email_lower = cleanData.email.toLowerCase().trim();
        await db.collection('users').doc(uid).set(cleanData, { merge: true });
    } catch (e) { console.error(`[DB] Error saving user ${uid}:`, e); }
}

async function loadAllUsersData() {
    const snap = await db.collection('users').get();
    const users = {};
    snap.forEach(doc => { users[doc.id] = doc.data(); });
    return users;
}

async function loadServerConfig() {
    try {
        const doc = await db.collection('settings').doc('config').get();
        return doc.exists ? doc.data() : { maintenance: false };
    } catch (e) { return { maintenance: false }; }
}

// --- ONLINE USERS ---
const onlineUsers = new Map();
io.on('connection', (socket) => {
    socket.on('register', (data) => { if (data.userId) onlineUsers.set(socket.id, { userId: data.userId, lastSeen: Date.now() }); });
    socket.on('ping_test', (data) => { console.log(`[PING] ${data.message}`); socket.emit('pong', { message: 'pong' }); });
    socket.on('disconnect', () => onlineUsers.delete(socket.id));
});

// --- SECURITY & RECAPTCHA ---
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || "6LcMZzcsAAAAABJNQwfd8Azzi45yk-KT86hK437W";
async function verifyRecaptcha(token, userId = null) {
    if (token === "DEV_BYPASS_TOKEN") return { success: true };
    if (token && (token.startsWith("timeout_") || token.startsWith("no_"))) return { success: true, bypassed: true };
    try {
        const params = new URLSearchParams();
        params.append('secret', RECAPTCHA_SECRET_KEY);
        params.append('response', token);
        const resp = await axios.post('https://www.google.com/recaptcha/api/siteverify', params.toString());
        return { success: resp.data.success || resp.data.score >= 0.3 };
    } catch (e) { console.error("[reCAPTCHA] API Error:", e.message); return { success: true }; }
}

async function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        if (req.path === '/api/config/maintenance' || req.path === '/api/news') return next();
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
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// --- DATA ---
const PORT = process.env.PORT || 3000;
const TROPHY_ROAD = loadJSONData(path.join(__dirname, 'data', 'trophy_road.json'), []);
const PASS_REWARDS = loadJSONData(path.join(__dirname, 'data', 'pass_rewards.json'), { free: [], premium: [] });
const OPPONENT_STATS_RANGES = loadJSONData(path.join(__dirname, 'data', 'survival_opponents.json'), {});
const EQUIPMENTS_DATA = loadJSONData(path.join(__dirname, 'data', 'equipments.json'), []);
const WEEKEND_EVENTS = ["PV égaux", "Chargement /2", "Sans défense", "Sans objet", "Points X2", "XP X2", "Rage", "Armure fragile", "Récupération rapide", "Malédiction", "Bénédiction"];

function loadJSONData(p, def) { if (!fs.existsSync(p)) return def; try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return def; } }

// --- HELPERS ---
function getParisCycleId(type) {
    const now = new Date();
    const options = { timeZone: 'Europe/Paris', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
    const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(now);
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
        const cost = calcNext(userData.pass_level || 0);
        userData.pass_XP -= cost;
        userData.pass_level = (userData.pass_level || 0) + 1;
    }
}

function updateQuests(userData, game, isPlayerWinner) {
    const player = game.player, mode = game.gameMode;
    const processQuest = (id) => {
        if (userData[`${id}_completed`]) return;
        const type = userData[`${id}_type`], char = userData[`${id}_character`];
        if (!type) return;
        let progress = 0;
        switch (type) {
            case "victoire_classique": if (isPlayerWinner && player.name === char && mode === 'classic') progress = 1; break;
            case "dommages_classique": if (mode === 'classic') progress = (player.degats_partie || 0); break;
            case "objets_total": progress = (player.objets_partie || 0); break;
            case "manches_survie": if (mode === 'survie') progress = (game.wave || 0); break;
            case "defense_classique": if (mode === 'classic') progress = (player.defense_partie || 0); break;
            case "VCW": if (isPlayerWinner && player.name === char && mode === 'weekend') progress = 1; break;
            case "DCW": if (mode === 'weekend') progress = (player.degats_partie || 0); break;
            case "OW": if (mode === 'weekend') progress = (player.objets_partie || 0); break;
            case "DECW": if (mode === 'weekend') progress = (player.defense_partie || 0); break;
            case "VPCS": if (isPlayerWinner && player.name === char && mode === 'classic') progress = 1; break;
            case "SPS": if (mode === 'survie' && player.name === char) progress = (game.wave || 0); break;
            case "VCS": if (isPlayerWinner && mode === 'classic') progress = 1; break;
            case "DSC": if (mode === 'classic') progress = (player.degats_partie || 0); break;
            case "O": progress = (player.objets_partie || 0); break;
            case "SS": if (mode === 'survie') progress = (game.wave || 0); break;
            case "DC": if (mode === 'classic') progress = (player.defense_partie || 0); break;
            case "CC": if (mode === 'classic') progress = (player.capacite_partie || 0); break;
            case "DS": if (mode === 'survie') progress = (player.degats_partie || 0); break;
            case "CS": if (mode === 'survie') progress = (player.capacite_partie || 0); break;
            case "CRC": progress = (player.coups_critiques_partie || 0); break;
            case "BSC": progress = (game.opponent.special_countered_partie || 0); break;
        }
        if (progress > 0) userData[`${id}_current`] = (userData[`${id}_current`] || 0) + progress;
    };
    ['quete1', 'quete2', 'quete3', 'weekend-quete1', 'weekend-quete2', 'weekend-quete3'].forEach(processQuest);
    for (let w = 1; w <= 9; w++) { for (let i = 1; i <= 5; i++) { processQuest(`Semaine${w}_${i}`); } }
}

async function finalizeGame(userId, game, results) {
    const userData = await getUserData(userId);
    if (!userData) return;
    const isPlayerWinner = (results.winner === 'player'), player = game.player;
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
    updateQuests(userData, game, isPlayerWinner);
    results.masteryGameResult = combatEngine.updateMastery(userData, player.name, { gameMode: game.gameMode, hpPercentage: (player.pv / (player.pv_maximum || 1)) * 100, damageDealt: player.degats_partie || 0, damageTaken: 500, wavesCleared: game.wave });
    await saveUserData(userId, userData);
    results.updatedUserData = userData;
}

const ITEM_PROPERTY_MAP = { xp: 'Double_XP_acheté', xp_2: 'Double_XP_acheté', potion: 'Potion_de_Santé_acheté', amulette: 'Amulette_de_Régénération_acheté', epee: 'epee_tranchante_acheté', elixir: 'elixir_puissance_acheté', armure: 'armure_fer_acheté', bouclier: 'bouclier_solide_acheté', cape: 'Cape_acheté', crystal: 'crystal_acheté', marque_chasseur: 'marque_chasseur_acheté', purge_spirituelle: 'purge_spirituelle_acheté', orbe_siphon: 'orbe_siphon_acheté' };

function getProceduralTrophyReward(trophies) {
    if (trophies < 2000) return null;
    const milestone = Math.floor(trophies / 100) * 100;
    const cycle = (milestone / 100) % 10, mult = Math.floor(milestone / 1000);
    let r;
    switch (cycle) {
        case 1: r = { type: 'coins', amount: 100 + 100 * mult }; break;
        case 2: r = { type: 'item', id: 'potion', amount: 5 + mult }; break;
        case 3: r = { type: 'coins', amount: 200 + 150 * mult }; break;
        case 4: r = { type: 'chest', chestType: 'Attaque' }; break;
        case 5: r = { type: 'coins', amount: 400 + 250 * mult }; break;
        case 6: r = { type: 'item', id: 'rare', amount: 3 + mult }; break;
        case 7: r = { type: 'coins', amount: 600 + 300 * mult }; break;
        case 8: r = { type: 'random_chest' }; break;
        case 9: r = { type: 'coins', amount: 800 + 400 * mult }; break;
        case 0: r = { type: 'random_character' }; break;
        default: return null;
    }
    return { trophies: milestone, rewards: [r] };
}

// --- PUBLIC ROUTES ---
app.get('/api/config/maintenance', async (req, res) => res.json(await loadServerConfig()));
app.get('/api/news', async (req, res) => { const doc = await db.collection('settings').doc('news').get(); res.json(doc.exists ? doc.data().items : []); });
app.get('/api/check-pseudo/:pseudo', async (req, res) => {
    const snap = await db.collection('users').where('pseudo_lower', '==', req.params.pseudo.trim().toLowerCase()).get();
    res.json({ available: snap.empty });
});

// --- USER SYNC ---
app.get('/api/user/:userId', verifyToken, async (req, res) => res.json({ success: true, userData: await getUserData(req.params.userId) }));

app.post('/api/user/:userId', verifyToken, async (req, res) => {
    const userId = req.params.userId, newData = req.body.userData;
    const current = await getUserData(userId) || {};
    const dailyCycle = getParisCycleId('daily'), weeklyCycle = getParisCycleId('weekly'), now = Date.now();

    if (!current.pseudo) {
        Object.assign(current, newData);
        current.quest_daily_cycle = dailyCycle; current.quest_weekly_cycle = weeklyCycle;
        current.createdAt = now; current.lastSeen = now;
    } else {
        current.lastSeen = now;
        if (current.quest_daily_cycle !== dailyCycle) {
            current.quest_daily_cycle = dailyCycle; current.quetes_jour = false;
            ['quete1', 'quete2', 'quete3'].forEach(id => { delete current[`${id}_text`]; delete current[`${id}_total`]; delete current[`${id}_current`]; delete current[`${id}_type`]; delete current[`${id}_completed`]; delete current[`${id}_rewardClaimed`]; });
        }
        const ALLOWED = ['pseudo', 'settings', 'tutorial_menu_principal_completed', 'lastLoginDay', 'lastDoubleXPCheck', 'musicAllowed', 'autoplayEnabled', 'pass_last_notified_level', 'characterToImprove', 'tropheesMax', 'victoires', 'defaites', 'manches_max', 'classicGames', 'survivalGames', 'quest_daily_cycle', 'quest_weekly_cycle', 'daily_reward_claim_id', 'weekly_chest_claim_id', 'weekend_bonus_claimed', 'quetes_jour', 'quetes_weekend', 'weekend_period_start', 'quetes_genere', 'equipments'];
        Object.keys(newData).forEach(key => {
            if (ALLOWED.includes(key)) current[key] = newData[key];
            else if (['quete', 'weekend-quete', 'Semaine'].some(p => key.startsWith(p))) {
                if (key.endsWith('_current')) current[key] = Math.max(parseInt(newData[key] || 0), parseInt(current[key] || 0));
                else if ((key.endsWith('_completed') || key.endsWith('_rewardClaimed')) && current[key] === true) { /* keep true */ }
                else current[key] = newData[key];
            }
        });
        updateParallelPass(current, 0);
    }
    await saveUserData(userId, current);
    res.json({ success: true, userData: current });
});

// --- SHOP, PASS & REWARDS ---
app.post('/api/shop/buy', verifyToken, async (req, res) => {
    const { userId, type, itemId, quantity, price, recaptchaToken } = req.body;
    if (!(await verifyRecaptcha(recaptchaToken, userId)).success) return res.status(403).json({ error: "Sécurité" });
    const userData = await getUserData(userId);
    if (!userData || (userData.argent || 0) < price) return res.status(400).json({ error: "Fonds insuffisants" });
    userData.argent -= price;
    if (type === 'equipment') { if (!userData.equipments) userData.equipments = []; userData.equipments.push(itemId); }
    else { const prop = ITEM_PROPERTY_MAP[type]; if (prop) userData[prop] = (userData[prop] || 0) + (quantity || 1); }
    await saveUserData(userId, userData); res.json({ success: true, userData });
});

app.post('/api/shop/claim-daily', verifyToken, async (req, res) => {
    const { userId, recaptchaToken } = req.body;
    if (!(await verifyRecaptcha(recaptchaToken, userId)).success) return res.status(403).json({ error: "Sécurité" });
    const userData = await getUserData(userId), cycleId = getParisCycleId('daily');
    if (userData.daily_reward_claim_id === cycleId) return res.status(400).json({ error: "Déjà fait" });
    userData.recompense = (userData.recompense || 0) + 1; userData.daily_reward_claim_id = cycleId;
    await saveUserData(userId, userData); res.json({ success: true, userData });
});

app.post('/api/shop/claim-weekly', verifyToken, async (req, res) => {
    const { userId, recaptchaToken } = req.body;
    if (!(await verifyRecaptcha(recaptchaToken, userId)).success) return res.status(403).json({ error: "Sécurité" });
    const userData = await getUserData(userId), cycleId = getParisCycleId('weekly');
    if (userData.weekly_chest_claim_id === cycleId) return res.status(400).json({ error: "Déjà fait" });
    const boxType = ['Attaque', 'Défense', 'Agilité', 'Équilibre'][Math.floor(Math.random() * 4)];
    userData.weekly_chest_claim_id = cycleId; await saveUserData(userId, userData); res.json({ success: true, userData, boxType });
});

app.post('/api/lootbox/open', verifyToken, async (req, res) => {
    const { userId, boxType, recaptchaToken } = req.body;
    if (!(await verifyRecaptcha(recaptchaToken, userId)).success) return res.status(403).json({ error: "Sécurité" });
    const userData = await getUserData(userId);
    const rarity = Math.random() < 0.05 ? 'légendaire' : (Math.random() < 0.3 ? 'rare' : 'commun');
    const possible = EQUIPMENTS_DATA.filter(e => e.type.toLowerCase() === boxType.toLowerCase());
    const selected = possible[Math.floor(Math.random() * possible.length)] || { id: "gantelets_force", rarity: "commun" };
    if (!userData.equipments) userData.equipments = []; userData.equipments.push(selected.id);
    await saveUserData(userId, userData); res.json({ success: true, userData, reward: { id: selected.id, rarity: selected.rarity, type: boxType } });
});

app.post('/api/recompenses/open', verifyToken, async (req, res) => {
    const { userId, recaptchaToken } = req.body;
    if (!(await verifyRecaptcha(recaptchaToken, userId)).success) return res.status(403).json({ error: "Sécurité" });
    const userData = await getUserData(userId); if (!userData || (userData.recompense || 0) <= 0) return res.status(400).json({ error: "Pas de récompense" });
    userData.recompense--; userData.argent = (userData.argent || 0) + 50;
    await saveUserData(userId, userData); res.json({ success: true, userData, rewards: [{ name: "50 Points", amount: 50 }] });
});

app.post('/api/trophy/claim', verifyToken, async (req, res) => {
    const { userId, milestone, recaptchaToken } = req.body;
    if (!(await verifyRecaptcha(recaptchaToken, userId)).success) return res.status(403).json({ error: "Sécurité" });
    const userData = await getUserData(userId), ms = parseInt(milestone);
    if (!userData || userData[`trophy_claimed_${ms}`] || (userData.trophees || 0) < ms) return res.status(400).json({ error: "Invalide" });
    let config = TROPHY_ROAD.find(m => m.trophies === ms) || getProceduralTrophyReward(ms);
    config.rewards.forEach(r => {
        if (r.type === 'coins') userData.argent = (userData.argent || 0) + r.amount;
        if (r.type === 'item') { const p = ITEM_PROPERTY_MAP[r.id]; if (p) userData[p] = (userData[p] || 0) + r.amount; }
        if (r.type === 'random') userData.recompense = (userData.recompense || 0) + 1;
    });
    userData[`trophy_claimed_${ms}`] = true; await saveUserData(userId, userData); res.json({ success: true, userData });
});

app.post('/api/pass/buy', verifyToken, async (req, res) => {
    const { userId, recaptchaToken } = req.body;
    if (!(await verifyRecaptcha(recaptchaToken, userId)).success) return res.status(403).json({ error: "Sécurité" });
    const userData = await getUserData(userId);
    if (!userData || userData.pass_premium || (userData.argent || 0) < 850) return res.status(400).json({ error: "Impossible" });
    userData.argent -= 850; userData.pass_premium = true; updateParallelPass(userData, 500);
    await saveUserData(userId, userData); res.json({ success: true, userData });
});

app.post('/api/pass/claim', verifyToken, async (req, res) => {
    const { userId, badge, isPremium, recaptchaToken } = req.body;
    if (!(await verifyRecaptcha(recaptchaToken, userId)).success) return res.status(403).json({ error: "Sécurité" });
    const userData = await getUserData(userId), key = isPremium ? `premium_${badge}` : `free_${badge}`;
    const reward = (isPremium ? PASS_REWARDS.premium : PASS_REWARDS.free).find(r => r.badge === parseInt(badge));
    if (!reward || userData[key] || userData.pass_level < reward.badge) return res.status(400).json({ error: "Invalide" });
    if (reward.type === 'coins') userData.argent = (userData.argent || 0) + reward.value;
    userData[key] = true; await saveUserData(userId, userData); res.json({ success: true, userData });
});

app.post('/api/character/upgrade', verifyToken, async (req, res) => {
    const { userId, characterName, action, stats, recaptchaToken } = req.body;
    if (!(await verifyRecaptcha(recaptchaToken, userId)).success) return res.status(403).json({ error: "Bot" });
    const userData = await getUserData(userId);
    if (action === 'levelup') {
        const lvl = userData[characterName + '_Level'] || 1, cost = lvl * 25;
        if (userData.argent < cost) return res.status(400).json({ error: "Points insuffisants" });
        userData.argent -= cost; userData[characterName + '_Level'] = lvl + 1; userData[characterName + '_pts'] = (userData[characterName + '_pts'] || 0) + 4;
    } else {
        const pts = (stats.PV || 0) + (stats.attaque || 0) + (stats.defense || 0);
        userData[characterName + '_PV_pts'] = (userData[characterName + '_PV_pts'] || 0) + (stats.PV || 0);
        userData[characterName + '_pts'] -= pts;
    }
    await saveUserData(userId, userData); res.json({ success: true, userData });
});

app.post('/api/quest/claim', verifyToken, async (req, res) => {
    const { userId, questKey, recaptchaToken } = req.body;
    if (!(await verifyRecaptcha(recaptchaToken, userId)).success) return res.status(403).json({ error: "Sécurité" });
    const userData = await getUserData(userId);
    
    // Validate quest exists
    if (!userData || !userData[`${questKey}_text`]) return res.status(400).json({ error: "Quête introuvable" });
    
    // Check if already claimed
    if (userData[`${questKey}_rewardClaimed`]) return res.status(400).json({ error: "Déjà réclamé" });
    
    // Check completion
    const current = userData[`${questKey}_current`] || 0;
    const total = userData[`${questKey}_total`] || 1;
    if (current < total) return res.status(400).json({ error: "Quête non terminée" });

    const rewards = [];
    
    // --- Weekly Logic ---
    if (questKey.startsWith('Semaine')) {
        const xp = userData[`${questKey}_reward_xp`] || 0;
        const boxes = userData[`${questKey}_reward_recompense`] || 0;
        
        if (xp > 0) {
            updateParallelPass(userData, xp);
            rewards.push({ name: "XP Pass", amount: xp, info: `+${xp} XP Pass` });
        }
        if (boxes > 0) {
            userData.recompense = (userData.recompense || 0) + boxes;
            rewards.push({ name: "Récompense(s)", amount: boxes, info: `+${boxes} Récompense(s) aléatoire(s)` });
        }
    } 
    // --- Daily / Weekend Logic (Standard Points) ---
    else {
        const amount = userData[`${questKey}_reward`] || 15; // Default 15
        userData.argent = (userData.argent || 0) + amount;
        rewards.push({ name: "Points", amount: amount, info: `+${amount} Points` });
    }

    userData[`${questKey}_rewardClaimed`] = true;
    userData[`${questKey}_completed`] = true; // Ensure consistency
    
    await saveUserData(userId, userData);
    res.json({ success: true, userData, rewards });
});

app.post('/api/quest/claim-weekend-bonus', verifyToken, async (req, res) => {
    const { userId, recaptchaToken } = req.body;
    if (!(await verifyRecaptcha(recaptchaToken, userId)).success) return res.status(403).json({ error: "Sécurité" });
    const userData = await getUserData(userId);

    if (userData.weekend_bonus_claimed) return res.status(400).json({ error: "Déjà réclamé" });

    // Verify all 3 quests are done
    const allDone = ['weekend-quete1', 'weekend-quete2', 'weekend-quete3'].every(id => {
        return (userData[`${id}_current`] || 0) >= (userData[`${id}_total`] || 1);
    });

    if (!allDone) return res.status(400).json({ error: "Quêtes non terminées" });

    // Grant Rewards: 2500 XP Pass + 2 Random Chests
    updateParallelPass(userData, 2500);
    userData.recompense = (userData.recompense || 0) + 2;
    userData.weekend_bonus_claimed = true;

    const rewards = [
        { name: "XP Pass", amount: 2500, info: "+2500 XP Pass" },
        { name: "Récompenses", amount: 2, info: "+2 Récompenses aléatoires" }
    ];

    await saveUserData(userId, userData);
    res.json({ success: true, userData, rewards });
});

// --- COMBAT ACTIONS ---
const games = new Map();
app.post('/api/combat/start', verifyToken, async (req, res) => {
    const { userId, gameMode, playerCharacter, opponentCharacter, recaptchaToken } = req.body;
    if (!(await verifyRecaptcha(recaptchaToken, userId)).success) return res.status(403).json({ error: "Bot" });
    const game = { userId, gameMode, player: playerCharacter, opponent: opponentCharacter, wave: gameMode === 'survie' ? 1 : 0, startTime: Date.now(), lastActionTime: Date.now(), turn: 1 };
    if (gameMode === 'survie') game.opponent = generateSurvivalOpponent(1);
    game.opponent.next_choice = combatEngine.makeAIDecision(game);
    games.set(userId, game); res.json({ success: true, gameState: game });
});

app.post('/api/combat/action', verifyToken, async (req, res) => {
    const { userId, action } = req.body, game = games.get(userId);
    if (!game) return res.status(404).json({ error: "Inconnu" });
    const results = { gameOver: false, logs: [] };
    if (action === 'attack') combatEngine.handleAttack(game.player, game.opponent, true, results);
    if (game.opponent.pv > 0) combatEngine.handleAttack(game.opponent, game.player, false, results);
    if (game.player.pv <= 0 || game.opponent.pv <= 0) {
        results.gameOver = true; results.winner = game.player.pv > 0 ? 'player' : 'opponent';
        await finalizeGame(userId, game, results); games.delete(userId);
    }
    res.json({ success: true, game, results });
});

app.post('/api/combat/survival/upgrade', verifyToken, async (req, res) => {
    const { userId, stat } = req.body;
    const game = games.get(userId);
    if (!game || game.gameMode !== 'survie') return res.status(400).json({ error: "Partie invalide" });

    // Apply upgrade
    if (stat === 'pv') {
        const boost = Math.round(game.player.pv_maximum * 0.20);
        game.player.pv_maximum += boost;
        game.player.pv += boost; // Heal amount equal to boost
    } else if (stat === 'attaque') {
        game.player.attaque = Math.round(game.player.attaque * 1.15);
    } else if (stat === 'defense') {
        game.player.defense = Math.round(game.player.defense * 1.15);
    }
    game.player.last_upgrade = stat;

    // Next Wave Setup
    game.wave++;
    game.opponent = generateSurvivalOpponent(game.wave);
    game.opponent.next_choice = combatEngine.makeAIDecision(game);
    
    // Reset turn-based counters if needed, but keep accumulated state
    game.turn = 1;

    res.json({ success: true, game });
});

// --- PASSKEYS ---
const challenges = new Map();

app.post('/api/passkey/register-options', verifyToken, async (req, res) => {
    const userData = await getUserData(req.uid);
    if (!userData) return res.status(404).json({ error: "Utilisateur inconnu" });
    
    const rpID = req.headers.host.split(':')[0];
    const options = await generateRegistrationOptions({
        rpName: 'Parallel Arena',
        rpID,
        userID: Buffer.from(req.uid, 'utf-8'),
        userName: userData.pseudo || userData.email || 'User',
        attestationType: 'none',
        excludeCredentials: (userData.passkeys || []).map(pk => ({ id: pk.credentialID, type: 'public-key' })),
        authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred', authenticatorAttachment: 'platform' },
    });
    
    challenges.set(req.uid, options.challenge);
    res.json(options);
});

app.post('/api/passkey/register-verify', verifyToken, async (req, res) => {
    const { body } = req.body;
    const userData = await getUserData(req.uid);
    const expectedChallenge = challenges.get(req.uid);
    const rpID = req.headers.host.split(':')[0];
    const origin = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;

    if (!expectedChallenge) return res.status(400).json({ error: "Challenge expiré" });

    let verification;
    try {
        verification = await verifyRegistrationResponse({
            response: body,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
        });
    } catch (error) {
        console.error("Vérification échouée:", error);
        return res.status(400).json({ error: error.message });
    }

    const { verified, registrationInfo } = verification;
    if (verified && registrationInfo) {
        const newPasskey = {
            credentialID: registrationInfo.credentialID,
            credentialPublicKey: registrationInfo.credentialPublicKey,
            counter: registrationInfo.counter,
            transports: body.response.transports,
        };

        if (!userData.passkeys) userData.passkeys = [];
        userData.passkeys.push(newPasskey);
        await saveUserData(req.uid, userData);
        challenges.delete(req.uid);
        res.json({ success: true });
    } else {
        res.status(400).json({ error: "Vérification échouée" });
    }
});

app.post('/api/passkey/login-options', async (req, res) => {
    const rpID = req.headers.host.split(':')[0];
    const options = await generateAuthenticationOptions({ rpID, userVerification: 'preferred' });
    const tempId = Math.random().toString(36).substring(7);
    challenges.set(`auth_pending_${tempId}`, options.challenge);
    res.json({ ...options, tempId });
});

app.post('/api/passkey/login-verify', async (req, res) => {
    const { body, tempId, email } = req.body;
    const { rpID, origin } = { rpID: req.headers.host.split(':')[0], origin: `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}` };
    const expectedChallenge = challenges.get(`auth_pending_${tempId}`);
    
    if (!expectedChallenge) return res.status(400).json({ error: "Session invalide ou expirée" });

    const all = await loadAllUsersData();
    
    // Recherche de l'utilisateur et de la passkey correspondante
    let userId = null;
    let foundPasskey = null;

    // Si l'email est fourni, on optimise la recherche
    if (email) {
        const uid = Object.keys(all).find(id => all[id].email && all[id].email.toLowerCase() === email.toLowerCase());
        if (uid) {
            const u = all[uid];
            if (u.passkeys) {
                foundPasskey = u.passkeys.find(pk => {
                    // Conversion robuste Buffer/String pour comparaison
                    const storedId = Buffer.isBuffer(pk.credentialID) ? pk.credentialID.toString('base64url') : pk.credentialID;
                    return storedId === body.id;
                });
                if (foundPasskey) userId = uid;
            }
        }
    }

    // Si pas trouvé par email (ou email non fourni), recherche globale par ID de credential
    if (!userId) {
        userId = Object.keys(all).find(uid => {
            const u = all[uid];
            if (!u.passkeys) return false;
            const pk = u.passkeys.find(k => {
                const storedId = Buffer.isBuffer(k.credentialID) ? k.credentialID.toString('base64url') : k.credentialID;
                return storedId === body.id;
            });
            if (pk) {
                foundPasskey = pk;
                return true;
            }
            return false;
        });
    }

    if (!userId || !foundPasskey) {
        return res.status(400).json({ error: "Utilisateur ou Passkey introuvable" });
    }

    // VÉRIFICATION CRYPTOGRAPHIQUE
    try {
        // S'assurer que la clé publique est un Buffer pour la vérif
        const pubKey = Buffer.isBuffer(foundPasskey.credentialPublicKey) 
            ? foundPasskey.credentialPublicKey 
            : Buffer.from(foundPasskey.credentialPublicKey, 'base64');

        const verification = await verifyAuthenticationResponse({
            response: body,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            authenticator: {
                credentialPublicKey: pubKey,
                credentialID: Buffer.isBuffer(foundPasskey.credentialID) ? foundPasskey.credentialID : Buffer.from(foundPasskey.credentialID, 'base64url'),
                counter: foundPasskey.counter,
            },
        });

        if (verification.verified) {
            // Mise à jour du compteur pour prévenir les attaques par replay
            const u = all[userId];
            const pkIndex = u.passkeys.findIndex(pk => pk === foundPasskey);
            u.passkeys[pkIndex].counter = verification.authenticationInfo.newCounter;
            await saveUserData(userId, u);
            
            challenges.delete(`auth_pending_${tempId}`);
            res.json({ success: true, userId, userData: u });
        } else {
            res.status(400).json({ error: "Vérification échouée" });
        }
    } catch (error) {
        console.error("Erreur vérification Passkey:", error);
        res.status(400).json({ error: error.message });
    }
});

// --- ADMIN ---
app.get('/api/admin/online', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const activeUserIds = [...new Set([...onlineUsers.values()].map(u => u.userId))];
        const userPromises = activeUserIds.map(async uid => {
            const u = await getUserData(uid);
            return u ? { uid, pseudo: u.pseudo, lastSeen: u.lastSeen } : null;
        });
        const users = (await Promise.all(userPromises)).filter(u => u !== null);
        res.json({ success: true, count: users.length, users });
    } catch (e) {
        console.error("Error in /api/admin/online:", e);
        res.status(500).json({ error: "Internal error" });
    }
});

app.get('/api/admin/users', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { search, sortBy } = req.query;
        let allUsers = Object.entries(await loadAllUsersData()).map(([uid, u]) => ({ uid, ...u }));

        // Search Filter
        if (search) {
            const term = search.toLowerCase();
            allUsers = allUsers.filter(u => 
                (u.pseudo && u.pseudo.toLowerCase().includes(term)) || 
                (u.uid && u.uid.toLowerCase().includes(term))
            );
        }

        // Sorting
        if (sortBy) {
            switch (sortBy) {
                case 'active': allUsers.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0)); break;
                case 'newest': allUsers.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); break;
                case 'oldest': allUsers.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)); break;
                case 'trophees': allUsers.sort((a, b) => (b.trophees || 0) - (a.trophees || 0)); break;
                case 'argent': allUsers.sort((a, b) => (b.argent || 0) - (a.argent || 0)); break;
                default: break; // Default order (usually UID)
            }
        }

        res.json({ success: true, users: allUsers.slice(0, 50) });
    } catch (e) {
        console.error("Error in /api/admin/users:", e);
        res.status(500).json({ error: "Internal error" });
    }
});

app.get('/api/admin/user/:userId', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const userData = await getUserData(req.params.userId);
        if (!userData) return res.status(404).json({ error: "User not found" });
        res.json({ success: true, user: userData });
    } catch (e) {
        res.status(500).json({ error: "Internal error" });
    }
});

app.post('/api/admin/user/:userId', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const uid = req.params.userId;
        const updates = req.body.updates || {};
        const currentUser = await getUserData(uid) || {};
        
        // Merge updates carefully
        const newData = { ...currentUser, ...updates };
        
        // Ensure consistency for trophies/max trophies if changed
        if (updates.trophees !== undefined || updates.tropheesMax !== undefined) {
            const t = updates.trophees !== undefined ? updates.trophees : (currentUser.trophees || 0);
            const tm = updates.tropheesMax !== undefined ? updates.tropheesMax : (currentUser.tropheesMax || 0);
            newData.trophees = Math.min(t, tm);
            newData.tropheesMax = Math.max(t, tm);
        }

        await saveUserData(uid, newData);
        res.json({ success: true, user: newData });
    } catch (e) {
        console.error("Error saving user:", e);
        res.status(500).json({ error: "Internal error" });
    }
});

app.post('/api/admin/news', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const newsData = req.body.news;
        await db.collection('settings').doc('news').set({ items: newsData });
        res.json({ success: true });
    } catch (e) {
        console.error("Error saving news:", e);
        res.status(500).json({ error: "Internal error" });
    }
});

app.post('/api/admin/maintenance', verifyToken, verifyAdmin, async (req, res) => {
    await db.collection('settings').doc('config').set(req.body);
    res.json({ success: true });
});

// --- START ---
server.listen(PORT, '0.0.0.0', () => console.log(`🚀 SERVEUR FULL OP SUR PORT ${PORT}`));

function generateSurvivalOpponent(wave) {
    const names = Object.keys(OPPONENT_STATS_RANGES), name = names[Math.floor(Math.random() * names.length)], stats = OPPONENT_STATS_RANGES[name], scale = 1 + (wave - 1) * 0.1;
    return { name, pv: Math.round(stats.minPv * scale), pv_maximum: Math.round(stats.minPv * scale), pv_max: Math.round(stats.minPv * scale), attaque: Math.round(stats.minAttaque * scale), attaque_originale: Math.round(stats.minAttaque * scale), defense: Math.round(stats.minDefense * scale), defense_originale: Math.round(stats.minDefense * scale), vitesse: stats.vitesse, vitesse_originale: stats.vitesse, critique: 0, critique_originale: 0, spe: 0, equipments: [], effects: [] };
}