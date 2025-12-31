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
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || "6LeLMzwsAAAAAH7Z2KgL69mnh6Fm_ICG3vbmDNrD";
async function verifyRecaptcha(token, userId = null) {
    if (token === "DEV_BYPASS_TOKEN") return { success: true };
    if (token && (token.startsWith("timeout_") || token.startsWith("no_") || token.startsWith("error_") || token.startsWith("exception_"))) return { success: true, bypassed: true };
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
const SHOP_ITEMS = loadJSONData(path.join(__dirname, 'data', 'shop_items.json'), []);
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

app.get('/api/shop/daily-offer', verifyToken, async (req, res) => {
    const userId = req.uid;
    const userRef = db.collection('users').doc(userId);
    const today = getParisCycleId('daily');

    try {
        const { offer } = await db.runTransaction(async (t) => {
            const doc = await t.get(userRef);
            const userData = doc.exists ? doc.data() : {};
            
            // Check if offer exists for today
            if (userData.daily_offer && userData.daily_offer.date === today) {
                return { offer: userData.daily_offer };
            }

            // Generate new offer
            const randomIndex = Math.floor(Math.random() * SHOP_ITEMS.length);
            const baseItem = SHOP_ITEMS[randomIndex];
            const item = { ...baseItem, discountedPrice: Math.round(baseItem.price * 0.8) }; // 20% discount
            
            const newOffer = { date: today, item };
            userData.daily_offer = newOffer;
            
            t.set(userRef, userData, { merge: true });
            return { offer: newOffer };
        });
        res.json({ success: true, offer });
    } catch (e) {
        console.error("Daily offer error:", e);
        res.status(500).json({ error: "Erreur interne" });
    }
});

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
    const userRef = db.collection('users').doc(userId);
    try {
        await db.runTransaction(async (t) => {
            const doc = await t.get(userRef);
            if (!doc.exists) throw new Error("User not found");
            const userData = doc.data();

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
            
            const cleanData = JSON.parse(JSON.stringify(userData));
            if (cleanData.pseudo) cleanData.pseudo_lower = cleanData.pseudo.toLowerCase().trim();
            if (cleanData.email) cleanData.email_lower = cleanData.email.toLowerCase().trim();
            
            t.set(userRef, cleanData, { merge: true });
            results.updatedUserData = userData;
        });
    } catch (e) {
        console.error(`[DB] Error finalizing game for ${userId}:`, e);
    }
}

const ITEM_PROPERTY_MAP = { xp: 'Double_XP', xp_2: 'Double_XP', potion: 'Potion_de_Santé_acheté', amulette: 'Amulette_de_Régénération_acheté', epee: 'epee_tranchante_acheté', elixir: 'elixir_puissance_acheté', armure: 'armure_fer_acheté', bouclier: 'bouclier_solide_acheté', cape: 'Cape_acheté', crystal: 'crystal_acheté', marque_chasseur: 'marque_chasseur_acheté', purge_spirituelle: 'purge_spirituelle_acheté', orbe_siphon: 'orbe_siphon_acheté' };

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
app.get('/api/data/equipments', (req, res) => res.json(EQUIPMENTS_DATA));
app.get('/api/data/characters', (req, res) => res.json(CHARACTERS_DATA));

// --- USER SYNC ---
app.get('/api/user/:userId', verifyToken, async (req, res) => res.json({ success: true, userData: await getUserData(req.params.userId) }));

app.post('/api/user/:userId', verifyToken, async (req, res) => {
    const userId = req.params.userId, newData = req.body.userData;
    const userRef = db.collection('users').doc(userId);
    const dailyCycle = getParisCycleId('daily'), weeklyCycle = getParisCycleId('weekly'), now = Date.now();

    try {
        const userData = await db.runTransaction(async (t) => {
            const doc = await t.get(userRef);
            const current = doc.exists ? doc.data() : {};

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
                const ALLOWED = ['pseudo', 'settings', 'tutorial_menu_principal_completed', 'lastLoginDay', 'lastDoubleXPCheck', 'musicAllowed', 'autoplayEnabled', 'pass_last_notified_level', 'characterToImprove', 'tropheesMax', 'victoires', 'defaites', 'manches_max', 'classicGames', 'survivalGames', 'quest_daily_cycle', 'quest_weekly_cycle', 'daily_reward_claim_id', 'weekly_chest_claim_id', 'weekend_bonus_claimed', 'quetes_jour', 'quetes_weekend', 'weekend_period_start', 'quetes_genere', 'equipments', 'characters', 'musicVolume'];
                Object.keys(newData).forEach(key => {
                    if (ALLOWED.includes(key)) current[key] = newData[key];
                    else if (['quete', 'weekend-quete', 'Semaine'].some(p => key.startsWith(p))) {
                        if (key.endsWith('_current')) current[key] = Math.max(parseInt(newData[key] || 0), parseInt(current[key] || 0));
                        else if ((key.endsWith('_completed') || key.endsWith('_rewardClaimed')) && current[key] === true) { /* keep true */ }
                        else current[key] = newData[key];
                    }
                    // Allow character progression keys
                    else if (key.endsWith('_pts') || key.endsWith('_Level') || key.endsWith('_XP') || key.endsWith('_boost')) {
                        current[key] = newData[key];
                    }
                });
                updateParallelPass(current, 0);
            }
            
            const cleanData = JSON.parse(JSON.stringify(current));
            if (cleanData.pseudo) cleanData.pseudo_lower = cleanData.pseudo.toLowerCase().trim();
            if (cleanData.email) cleanData.email_lower = cleanData.email.toLowerCase().trim();

            t.set(userRef, cleanData, { merge: true });
            return current;
        });
        res.json({ success: true, userData });
    } catch (e) {
        console.error(`[DB] Error saving user ${userId}:`, e);
        res.status(500).json({ error: "Erreur interne" });
    }
});

// --- SHOP, PASS & REWARDS ---
app.post('/api/shop/buy', verifyToken, async (req, res) => {
    const { userId, type, itemId, quantity, price, recaptchaToken } = req.body;
    if (!(await verifyRecaptcha(recaptchaToken, userId)).success) return res.status(403).json({ error: "Sécurité" });
    
    const userRef = db.collection('users').doc(userId);
    try {
        const userData = await db.runTransaction(async (t) => {
            const doc = await t.get(userRef);
            if (!doc.exists) throw new Error("Utilisateur introuvable");
            const data = doc.data();
            
            if ((data.argent || 0) < price) throw new Error("Fonds insuffisants");
            
            data.argent -= price;
            if (type === 'equipment') { 
                if (!data.equipments) data.equipments = []; 
                data.equipments.push(itemId); 
            } else { 
                const prop = ITEM_PROPERTY_MAP[type]; 
                if (prop) data[prop] = (data[prop] || 0) + (quantity || 1); 
            }
            
            t.set(userRef, data, { merge: true });
            return data;
        });
        res.json({ success: true, userData });
    } catch (e) {
        if (e.message === "Fonds insuffisants") return res.status(400).json({ error: e.message });
        console.error("Shop buy error:", e);
        res.status(500).json({ error: "Erreur interne" });
    }
});

app.post('/api/shop/claim-daily', verifyToken, async (req, res) => {
    const { userId, recaptchaToken } = req.body;
    if (!(await verifyRecaptcha(recaptchaToken, userId)).success) return res.status(403).json({ error: "Sécurité" });
    
    const userRef = db.collection('users').doc(userId);
    const cycleId = getParisCycleId('daily');

    try {
        const userData = await db.runTransaction(async (t) => {
            const doc = await t.get(userRef);
            if (!doc.exists) throw new Error("Utilisateur introuvable");
            const data = doc.data();

            if (data.daily_reward_claim_id === cycleId) throw new Error("Déjà fait");
            
            data.recompense = (data.recompense || 0) + 1; 
            data.daily_reward_claim_id = cycleId;
            
            t.set(userRef, data, { merge: true });
            return data;
        });
        res.json({ success: true, userData });
    } catch (e) {
        if (e.message === "Déjà fait") return res.status(400).json({ error: e.message });
        res.status(500).json({ error: "Erreur interne" });
    }
});

app.post('/api/shop/claim-weekly', verifyToken, async (req, res) => {
    const { userId, recaptchaToken } = req.body;
    if (!(await verifyRecaptcha(recaptchaToken, userId)).success) return res.status(403).json({ error: "Sécurité" });
    
    const userRef = db.collection('users').doc(userId);
    const cycleId = getParisCycleId('weekly');

    try {
        const { userData, boxType } = await db.runTransaction(async (t) => {
            const doc = await t.get(userRef);
            if (!doc.exists) throw new Error("Utilisateur introuvable");
            const data = doc.data();

            if (data.weekly_chest_claim_id === cycleId) throw new Error("Déjà fait");
            
            const boxType = ['Attaque', 'Défense', 'Agilité', 'Équilibre'][Math.floor(Math.random() * 4)];
            data.weekly_chest_claim_id = cycleId; 
            
            t.set(userRef, data, { merge: true });
            return { userData: data, boxType };
        });
        res.json({ success: true, userData, boxType });
    } catch (e) {
        if (e.message === "Déjà fait") return res.status(400).json({ error: e.message });
        res.status(500).json({ error: "Erreur interne" });
    }
});

app.post('/api/lootbox/open', verifyToken, async (req, res) => {
    const { userId, boxType, recaptchaToken } = req.body;
    if (!(await verifyRecaptcha(recaptchaToken, userId)).success) return res.status(403).json({ error: "Sécurité" });
    
    const userRef = db.collection('users').doc(userId);

    try {
        const { userData, reward } = await db.runTransaction(async (t) => {
            const doc = await t.get(userRef);
            const data = doc.exists ? doc.data() : {};
            
            const rarity = Math.random() < 0.05 ? 'légendaire' : (Math.random() < 0.3 ? 'rare' : 'commun');
            const possible = EQUIPMENTS_DATA.filter(e => e.type.toLowerCase() === boxType.toLowerCase());
            const selected = possible[Math.floor(Math.random() * possible.length)] || { id: "gantelets_force", rarity: "commun" };
            
            if (!data.equipments) data.equipments = []; 
            data.equipments.push(selected.id);
            
            t.set(userRef, data, { merge: true });
            return { userData: data, reward: { id: selected.id, rarity: selected.rarity, type: boxType } };
        });
        res.json({ success: true, userData, reward });
    } catch (e) {
        console.error("Lootbox error:", e);
        res.status(500).json({ error: "Erreur interne" });
    }
});

app.post('/api/recompenses/open', verifyToken, async (req, res) => {
    const { userId, recaptchaToken } = req.body;
    if (!(await verifyRecaptcha(recaptchaToken, userId)).success) return res.status(403).json({ error: "Sécurité" });
    
    const userRef = db.collection('users').doc(userId);

    try {
        const { userData, rewards } = await db.runTransaction(async (t) => {
            const doc = await t.get(userRef);
            const userData = doc.exists ? doc.data() : null;
            
            if (!userData) throw new Error("Utilisateur inconnu");
            if ((userData.recompense || 0) <= 0 && (userData.perso_recompense || 0) <= 0) throw new Error("Pas de récompense");

            const rewards = [];
            
            // --- HELPERS ---
            const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
            const rarityProbabilities = { 1: 0.05, 2: 0.10, 3: 0.20, 4: 0.30, 5: 0.35 };
            const xpRanges = { 1: [150, 300], 2: [100, 150], 3: [50, 100], 4: [20, 50], 5: [5, 20] };
            const charactersRarity = { 'Doudou': 4, 'Coeur': 3, 'Grours': 3, 'Baleine': 4, 'Poulpy': 2, 'Willy': 4, 'Oiseau': 3, 'Colorina': 5, 'Cocobi': 1, 'Diva': 1, 'Sboonie': 5, 'Rosalie': 2, 'Inconnue': 2, 'Boompy': 1, 'Perro': 5 };
            
            const getRandomRarity = () => {
                const r = Math.random();
                let cum = 0;
                for (const [lvl, prob] of Object.entries(rarityProbabilities)) {
                    cum += prob;
                    if (r < cum) return parseInt(lvl);
                }
                return 5;
            };

            // --- LOGIC ---
            if ((userData.perso_recompense || 0) > 0) {
                userData.perso_recompense--;
                let obtained = false;
                for (let i = 0; i < 10; i++) {
                    const targetRarity = getRandomRarity();
                    const available = Object.keys(charactersRarity).filter(c => !userData[c] && charactersRarity[c] === targetRarity);
                    if (available.length > 0) {
                        const charName = available[getRandomInt(0, available.length - 1)];
                        userData[charName] = 1; // Unlock
                        rewards.push({ name: "Personnage", info: `Vous avez débloqué : ${charName} !` });
                        obtained = true;
                        break;
                    }
                }
                if (!obtained) {
                     const amt = getRandomInt(1, 5);
                     userData.Double_XP = (userData.Double_XP || 0) + amt;
                     rewards.push({ name: "Double XP", amount: amt, info: `+${amt} Double XP` });
                }
            } else {
                userData.recompense--;
                const rewardTypes = [
                  { type: 'character', chance: 0.06 },
                  { type: 'doubleXP', chance: 0.11 },
                  { type: 'healthPotion', chance: 0.11 },
                  { type: 'amulet', chance: 0.10 },
                  { type: 'xp', chance: 0.11 },
                  { type: 'money', chance: 0.12 },
                  { type: 'epee', chance: 0.10 },
                  { type: 'elixir', chance: 0.10 },
                  { type: 'armor', chance: 0.10 },
                  { type: 'bouclier', chance: 0.09 },
                  { type: 'cape', chance: 0.10 },
                  { type: 'crystal', chance: 0.10 }, // Total ~1.2? normalized loop handles it
                ];
                
                const getRewardType = () => {
                    const r = Math.random() * 1.2; // Approximate sum
                    let cum = 0;
                    for (const rt of rewardTypes) {
                        cum += rt.chance;
                        if (r < cum) return rt.type;
                    }
                    return 'money';
                };

                const numRewards = Math.random() < 0.7 ? 1 : (Math.random() < 0.9 ? 2 : 3);

                for (let i = 0; i < numRewards; i++) {
                    const type = getRewardType();
                    switch (type) {
                        case 'character':
                            const rLevel = getRandomRarity();
                            const avail = Object.keys(charactersRarity).filter(c => !userData[c] && charactersRarity[c] === rLevel);
                            if (avail.length > 0) {
                                const cName = avail[getRandomInt(0, avail.length - 1)];
                                userData[cName] = 1;
                                rewards.push({ name: "Personnage", info: `Nouveau : ${cName}` });
                            } else {
                                // Fallback money
                                const m = getRandomInt(50, 150);
                                userData.argent = (userData.argent || 0) + m;
                                rewards.push({ name: "Points", amount: m, info: `+${m} Points (Fallback)` });
                            }
                            break;
                        case 'doubleXP':
                            const dx = getRandomInt(1, 3);
                            userData.Double_XP = (userData.Double_XP || 0) + dx;
                            rewards.push({ name: "Double XP", amount: dx, info: `+${dx} Double XP` });
                            break;
                        case 'healthPotion':
                            userData.Potion_de_Santé_acheté = (userData.Potion_de_Santé_acheté || 0) + 1;
                            rewards.push({ name: "Potion de Santé", amount: 1, info: "+1 Potion" });
                            break;
                        case 'amulet':
                            userData.Amulette_de_Régénération_acheté = (userData.Amulette_de_Régénération_acheté || 0) + 1;
                            rewards.push({ name: "Amulette", amount: 1, info: "+1 Amulette de Régénération" });
                            break;
                        case 'xp':
                            const unlocked = Object.keys(charactersRarity).filter(c => userData[c] === 1);
                            if (unlocked.length > 0) {
                                const char = unlocked[getRandomInt(0, unlocked.length - 1)];
                                // Calc random XP based on rarity logic (simplified here or reused)
                                const xRarity = getRandomRarity();
                                const [min, max] = xpRanges[xRarity] || [10, 50];
                                const xVal = getRandomInt(min, max);
                                userData[`${char}_XP`] = (userData[`${char}_XP`] || 0) + xVal;
                                rewards.push({ name: "XP Personnage", amount: xVal, info: `+${xVal} XP pour ${char}` });
                            } else {
                                 userData.argent = (userData.argent || 0) + 50;
                                 rewards.push({ name: "Points", amount: 50, info: "+50 Points" });
                            }
                            break;
                        case 'money':
                            const mon = getRandomInt(20, 100);
                            userData.argent = (userData.argent || 0) + mon;
                            rewards.push({ name: "Points", amount: mon, info: `+${mon} Points` });
                            break;
                        case 'epee': userData.epee_tranchante_acheté = (userData.epee_tranchante_acheté || 0) + 1; rewards.push({ name: "Épée Tranchante", amount: 1, info: "+1 Épée" }); break;
                        case 'elixir': userData.elixir_puissance_acheté = (userData.elixir_puissance_acheté || 0) + 1; rewards.push({ name: "Elixir", amount: 1, info: "+1 Elixir de Puissance" }); break;
                        case 'armor': userData.armure_fer_acheté = (userData.armure_fer_acheté || 0) + 1; rewards.push({ name: "Armure de Fer", amount: 1, info: "+1 Armure" }); break;
                        case 'bouclier': userData.bouclier_solide_acheté = (userData.bouclier_solide_acheté || 0) + 1; rewards.push({ name: "Bouclier Solide", amount: 1, info: "+1 Bouclier" }); break;
                        case 'cape': userData.Cape_acheté = (userData.Cape_acheté || 0) + 1; rewards.push({ name: "Cape de l'ombre", amount: 1, info: "+1 Cape" }); break;
                        case 'crystal': userData.crystal_acheté = (userData.crystal_acheté || 0) + 1; rewards.push({ name: "Crystal", amount: 1, info: "+1 Crystal de renouveau" }); break;
                    }
                }
            }

            t.set(userRef, userData, { merge: true });
            return { userData, rewards };
        });
        res.json({ success: true, userData, rewards });
    } catch (e) {
        if (e.message === "Pas de récompense") return res.status(400).json({ error: e.message });
        console.error(e);
        res.status(500).json({ error: "Erreur interne" });
    }
});

app.post('/api/trophy/claim', verifyToken, async (req, res) => {
    const { userId, milestone, recaptchaToken } = req.body;
    if (!(await verifyRecaptcha(recaptchaToken, userId)).success) return res.status(403).json({ error: "Sécurité" });
    
    const userRef = db.collection('users').doc(userId);
    const ms = parseInt(milestone);

    try {
        const userData = await db.runTransaction(async (t) => {
            const doc = await t.get(userRef);
            const userData = doc.exists ? doc.data() : null;
            
            if (!userData || userData[`trophy_claimed_${ms}`] || (userData.trophees || 0) < ms) throw new Error("Invalide");
            
            let config = TROPHY_ROAD.find(m => m.trophies === ms) || getProceduralTrophyReward(ms);
            config.rewards.forEach(r => {
                if (r.type === 'coins') userData.argent = (userData.argent || 0) + r.amount;
                if (r.type === 'item') { const p = ITEM_PROPERTY_MAP[r.id]; if (p) userData[p] = (userData[p] || 0) + r.amount; }
                if (r.type === 'random') userData.recompense = (userData.recompense || 0) + 1;
            });
            userData[`trophy_claimed_${ms}`] = true;
            
            t.set(userRef, userData, { merge: true });
            return userData;
        });
        res.json({ success: true, userData });
    } catch (e) {
        if (e.message === "Invalide") return res.status(400).json({ error: e.message });
        res.status(500).json({ error: "Erreur interne" });
    }
});

app.post('/api/pass/buy', verifyToken, async (req, res) => {
    const { userId, recaptchaToken } = req.body;
    if (!(await verifyRecaptcha(recaptchaToken, userId)).success) return res.status(403).json({ error: "Sécurité" });
    
    const userRef = db.collection('users').doc(userId);

    try {
        const userData = await db.runTransaction(async (t) => {
            const doc = await t.get(userRef);
            const userData = doc.exists ? doc.data() : null;
            
            if (!userData || userData.pass_premium || (userData.argent || 0) < 850) throw new Error("Impossible");
            
            userData.argent -= 850; 
            userData.pass_premium = true; 
            updateParallelPass(userData, 500);
            
            t.set(userRef, userData, { merge: true });
            return userData;
        });
        res.json({ success: true, userData });
    } catch (e) {
        if (e.message === "Impossible") return res.status(400).json({ error: e.message });
        res.status(500).json({ error: "Erreur interne" });
    }
});

app.post('/api/pass/claim', verifyToken, async (req, res) => {
    const { userId, badge, isPremium, recaptchaToken } = req.body;
    if (!(await verifyRecaptcha(recaptchaToken, userId)).success) return res.status(403).json({ error: "Sécurité" });
    
    const userRef = db.collection('users').doc(userId);

    try {
        const userData = await db.runTransaction(async (t) => {
            const doc = await t.get(userRef);
            const userData = doc.exists ? doc.data() : null;
            
            const key = isPremium ? `premium_${badge}` : `free_${badge}`;
            const reward = (isPremium ? PASS_REWARDS.premium : PASS_REWARDS.free).find(r => r.badge === parseInt(badge));
            
            if (!reward || userData[key] || userData.pass_level < reward.badge) throw new Error("Invalide");
            
            if (reward.type === 'coins') userData.argent = (userData.argent || 0) + reward.value;
            userData[key] = true;
            
            t.set(userRef, userData, { merge: true });
            return userData;
        });
        res.json({ success: true, userData });
    } catch (e) {
        if (e.message === "Invalide") return res.status(400).json({ error: e.message });
        res.status(500).json({ error: "Erreur interne" });
    }
});

app.post('/api/character/upgrade', verifyToken, async (req, res) => {
    const { userId, characterName, action, stats, recaptchaToken } = req.body;
    if (!(await verifyRecaptcha(recaptchaToken, userId)).success) return res.status(403).json({ error: "Bot" });
    
    const userRef = db.collection('users').doc(userId);

    try {
        const userData = await db.runTransaction(async (t) => {
            const doc = await t.get(userRef);
            const userData = doc.exists ? doc.data() : null;
            
            if (action === 'levelup') {
                const lvl = userData[characterName + '_Level'] || 1, cost = lvl * 25;
                if (userData.argent < cost) throw new Error("Points insuffisants");
                userData.argent -= cost; 
                userData[characterName + '_Level'] = lvl + 1; 
                userData[characterName + '_pts'] = (userData[characterName + '_pts'] || 0) + 4;
            } else {
                const pts = (stats.PV || 0) + (stats.attaque || 0) + (stats.defense || 0);
                userData[characterName + '_PV_pts'] = (userData[characterName + '_PV_pts'] || 0) + (stats.PV || 0);
                userData[characterName + '_attaque_pts'] = (userData[characterName + '_attaque_pts'] || 0) + (stats.attaque || 0);
                userData[characterName + '_defense_pts'] = (userData[characterName + '_defense_pts'] || 0) + (stats.defense || 0);
                userData[characterName + '_pts'] -= pts;
            }
            
            t.set(userRef, userData, { merge: true });
            return userData;
        });
        res.json({ success: true, userData });
    } catch (e) {
        if (e.message === "Points insuffisants") return res.status(400).json({ error: e.message });
        res.status(500).json({ error: "Erreur interne" });
    }
});

app.post('/api/quest/claim', verifyToken, async (req, res) => {
    const { userId, questKey, recaptchaToken } = req.body;
    if (!(await verifyRecaptcha(recaptchaToken, userId)).success) return res.status(403).json({ error: "Sécurité" });
    
    const userRef = db.collection('users').doc(userId);

    try {
        const { userData, rewards } = await db.runTransaction(async (t) => {
            const doc = await t.get(userRef);
            const userData = doc.exists ? doc.data() : null;
            
            if (!userData || !userData[`${questKey}_text`]) throw new Error("Quête introuvable");
            
            if (userData[`${questKey}_rewardClaimed`]) throw new Error("Déjà réclamé");
            
            const current = userData[`${questKey}_current`] || 0;
            const total = userData[`${questKey}_total`] || 1;
            if (current < total) throw new Error("Quête non terminée");

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
            
            t.set(userRef, userData, { merge: true });
            return { userData, rewards };
        });
        res.json({ success: true, userData, rewards });
    } catch (e) {
         if (e.message === "Quête introuvable" || e.message === "Déjà réclamé" || e.message === "Quête non terminée") 
             return res.status(400).json({ error: e.message });
         res.status(500).json({ error: "Erreur interne" });
    }
});

app.post('/api/quest/claim-weekend-bonus', verifyToken, async (req, res) => {
    const { userId, recaptchaToken } = req.body;
    if (!(await verifyRecaptcha(recaptchaToken, userId)).success) return res.status(403).json({ error: "Sécurité" });
    
    const userRef = db.collection('users').doc(userId);

    try {
        const { userData, rewards } = await db.runTransaction(async (t) => {
            const doc = await t.get(userRef);
            const userData = doc.exists ? doc.data() : null;

            if (userData.weekend_bonus_claimed) throw new Error("Déjà réclamé");

            const allDone = ['weekend-quete1', 'weekend-quete2', 'weekend-quete3'].every(id => {
                return (userData[`${id}_current`] || 0) >= (userData[`${id}_total`] || 1);
            });

            if (!allDone) throw new Error("Quêtes non terminées");

            updateParallelPass(userData, 2500);
            userData.recompense = (userData.recompense || 0) + 2;
            userData.weekend_bonus_claimed = true;

            const rewards = [
                { name: "XP Pass", amount: 2500, info: "+2500 XP Pass" },
                { name: "Récompenses", amount: 2, info: "+2 Récompenses aléatoires" }
            ];
            
            t.set(userRef, userData, { merge: true });
            return { userData, rewards };
        });
        res.json({ success: true, userData, rewards });
    } catch (e) {
        if (e.message === "Déjà réclamé" || e.message === "Quêtes non terminées") return res.status(400).json({ error: e.message });
        res.status(500).json({ error: "Erreur interne" });
    }
});

const CHARACTERS_DATA = loadJSONData(path.join(__dirname, 'data', 'characters.json'), []);

// --- COMBAT ACTIONS ---
const games = new Map();

function calculatePlayerStats(userData, charName) {
    const base = CHARACTERS_DATA.find(c => c.name === charName);
    if (!base) return null;

    // 1. Base & Upgrades
    const pvPts = userData[`${charName}_PV_pts`] || 0;
    const attPts = userData[`${charName}_attaque_pts`] || 0;
    const defPts = userData[`${charName}_defense_pts`] || 0;

    let pv = Math.round(base.pv * (1 + pvPts * 0.02));
    let atk = Math.round(base.attaque * (1 + attPts * 0.02));
    let def = Math.round(base.defense * (1 + defPts * 0.02));

    // 2. Equipment Bonuses (Equipped items ONLY)
    let equippedIds = [];
    if (userData.characters && userData.characters[charName] && userData.characters[charName].equipments) {
        equippedIds = userData.characters[charName].equipments;
    }

    // Verify ownership: Only allow items that are in the user's inventory
    const ownedEquipments = userData.equipments || [];
    equippedIds = equippedIds.filter(id => ownedEquipments.includes(id));

    const equippedItems = EQUIPMENTS_DATA.filter(e => equippedIds.includes(e.id));
    
    // Initialiser bonus
    let bonus = { pv: 0, attaque: 0, defense: 0, vitesse: 0, critique: 0 };
    
    equippedItems.forEach(item => {
        if (item.stats) {
            const parseVal = (v) => v ? parseInt(v.toString().replace('+','')) : 0;
            bonus.pv += parseVal(item.stats.pv);
            bonus.attaque += parseVal(item.stats.attaque);
            bonus.defense += parseVal(item.stats.defense);
            bonus.vitesse += parseVal(item.stats.vitesse);
            bonus.critique += parseVal(item.stats.critique);
        }
    });

    return {
        ...base,
        pv: pv + bonus.pv,
        pv_maximum: pv + bonus.pv,
        pv_max: pv + bonus.pv,
        attaque: atk + bonus.attaque,
        attaque_originale: atk + bonus.attaque,
        defense: def + bonus.defense,
        defense_originale: def + bonus.defense,
        vitesse: base.vitesse + bonus.vitesse,
        critique: (base.critique || 0) + bonus.critique,
        equipments: equippedIds
    };
}

app.post('/api/combat/start', verifyToken, async (req, res) => {
    const { userId, gameMode, playerCharacterName, opponentName, recaptchaToken } = req.body;
    const pName = playerCharacterName || (req.body.playerCharacter ? req.body.playerCharacter.name : null);
    const oName = opponentName || (req.body.opponentCharacter ? req.body.opponentCharacter.name : null);

    if (!(await verifyRecaptcha(recaptchaToken, userId)).success) return res.status(403).json({ error: "Bot" });
    const userData = await getUserData(userId);
    if (!userData) return res.status(404).json({ error: "User not found" });

    const player = calculatePlayerStats(userData, pName);
    if (!player) return res.status(400).json({ error: "Personnage invalide" });

    let opponent;
    if (gameMode === 'survie') opponent = generateSurvivalOpponent(1);
    else {
        const targetName = oName || CHARACTERS_DATA[Math.floor(Math.random() * CHARACTERS_DATA.length)].name;
        opponent = JSON.parse(JSON.stringify(CHARACTERS_DATA.find(c => c.name === targetName) || CHARACTERS_DATA[0]));
        opponent.pv_maximum = opponent.pv; opponent.pv_max = opponent.pv;
        opponent.attaque_originale = opponent.attaque; opponent.defense_originale = opponent.defense;
        opponent.equipments = []; opponent.effects = [];
    }

    const game = { userId, gameMode, player, opponent, wave: gameMode === 'survie' ? 1 : 0, startTime: Date.now(), lastActionTime: Date.now(), turn: 1, waitingForPlayer: false };

    // --- ANTICIPATION INITIALE (Tour 1 & 2) ---
    // Décision pour le Tour 1
    game.opponent.next_choice = combatEngine.makeAIDecision(game);
    // On simule une décision pour le Tour 2 pour savoir s'il faut parer dès le Tour 1
    const secondChoice = combatEngine.makeAIDecision(game); 
    
    const results = { logs: [] };
    combatEngine.updateTour(game.player, game.opponent, true, results);

    if (game.opponent.next_choice === 'defend' || secondChoice === 'defend') {
        game.opponent.defense_bouton = 1;
        game.opponent.defense_droit = 3;
        if (game.opponent.next_choice !== 'defend' && secondChoice === 'defend') {
            game.aiActionConsumed = true; // Il utilisera sa défense du T2 au T1
        }
    }

    // Initiative
    const pSpeed = combatEngine.getEffectiveStat(game.player, 'vitesse');
    const oSpeed = combatEngine.getEffectiveStat(game.opponent, 'vitesse');

    if (oSpeed > pSpeed) {
        const aiAction = game.opponent.next_choice;
        if (aiAction === 'attack') {
            game.opponent.defense_bouton = 0;
            combatEngine.handleAttack(game.opponent, game.player, false, results);
        } else if (aiAction === 'special') {
            game.opponent.defense_bouton = 0;
            combatEngine.applySpecialAbility(game.opponent, game.player, false, results);
        } else if (aiAction === 'defend') {
            // Déjà géré par le bouclier silencieux
        }
        game.waitingForPlayer = true;
    }

    games.set(userId, game); 
    res.json({ success: true, gameState: game, results });
});

app.post('/api/combat/action', verifyToken, async (req, res) => {
    const { userId, action, itemName } = req.body, game = games.get(userId);
    if (!game) return res.status(404).json({ error: "Inconnu" });
    const results = { gameOver: false, logs: [] };

    // --- LOGIQUE DE TOUR ---
    // Si on n'attendait pas le joueur, c'est un nouveau tour (Joueur plus rapide)
    if (!game.waitingForPlayer) {
        combatEngine.updateTour(game.player, game.opponent, true, results);
    }

    // ANTICIPATION CONTINUE : L'IA prévoit le tour d'après
    const futureChoice = combatEngine.makeAIDecision(game);
    let borrowedNextTurn = false;

    if (action === 'attack' && futureChoice === 'defend' && game.opponent.defense_bouton === 0) {
        game.opponent.defense_bouton = 1;
        game.opponent.defense_droit = 3;
        borrowedNextTurn = true;
    }

    const resolvePlayer = () => {
        if (game.player.pv <= 0) return;
        if (action === 'attack') {
            combatEngine.handleAttack(game.player, game.opponent, true, results);
        } else if (action === 'defend') {
            game.player.defense_bouton = 1; game.player.defense_droit = 3;
            results.logs.push({ text: "Vous vous préparez à parer la prochaine attaque !", color: "lightblue", side: "milieu" });
        } else if (action === 'special') {
            combatEngine.applySpecialAbility(game.player, game.opponent, true, results);
        } else if (action === 'use_item') {
            combatEngine.applyItem(game, itemName, results);
        } else if (action === 'cheat_win') {
            game.opponent.pv = 0;
            results.logs.push({ text: "VICTOIRE INSTANTANÉE (DEV) !", color: "gold", side: "milieu" });
        }
    };

    const resolveAI = () => {
        if (game.opponent.pv <= 0) return;
        if (game.aiActionConsumed) {
            game.aiActionConsumed = false;
            results.logs.push({ text: `${game.opponent.name} s'est déjà défendu de votre dernière attaque !`, color: "white", side: false });
            return;
        }
        const aiAction = game.opponent.next_choice || 'attack';
        if (aiAction === 'attack') {
            game.opponent.defense_bouton = 0;
            combatEngine.handleAttack(game.opponent, game.player, false, results);
        } else if (aiAction === 'special') {
            game.opponent.defense_bouton = 0;
            combatEngine.applySpecialAbility(game.opponent, game.player, false, results);
        }
        // Défense silencieuse : pas de log.
    };

    // Exécution
    const pSpeed = combatEngine.getEffectiveStat(game.player, 'vitesse');
    const oSpeed = combatEngine.getEffectiveStat(game.opponent, 'vitesse');

    if (game.waitingForPlayer) {
        resolvePlayer();
        game.waitingForPlayer = false;
        combatEngine.passerTour(game.player, results);
        combatEngine.passerTour(game.opponent, results);
    } else {
        if (pSpeed >= oSpeed) {
            resolvePlayer(); resolveAI();
        } else {
            resolveAI(); resolvePlayer();
        }
        combatEngine.passerTour(game.player, results);
        combatEngine.passerTour(game.opponent, results);
    }

    // Fin de tour : On valide les décisions futures
    if (game.player.pv > 0 && game.opponent.pv > 0) {
        game.opponent.next_choice = futureChoice;
        if (borrowedNextTurn) game.aiActionConsumed = true;

        // Préparation du tour suivant
        const nextPSpeed = combatEngine.getEffectiveStat(game.player, 'vitesse');
        const nextOSpeed = combatEngine.getEffectiveStat(game.opponent, 'vitesse');

        if (nextOSpeed > nextPSpeed) {
            combatEngine.updateTour(game.player, game.opponent, true, results);
            resolveAI();
            game.waitingForPlayer = true;
        }
    }

    if (game.player.pv <= 0 || game.opponent.pv <= 0) {
        results.gameOver = true;
        results.winner = game.player.pv > 0 ? 'player' : 'opponent';
        await finalizeGame(userId, game, results);
        games.delete(userId);
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
    
    // Helper pour nettoyer les IDs (gestion du bug JSON.stringify sur les Buffers)
    const cleanID = (id) => {
        if (!id) return id;
        if (typeof id === 'string') return id;
        if (Buffer.isBuffer(id)) return id.toString('base64url');
        if (id.type === 'Buffer' && Array.isArray(id.data)) return Buffer.from(id.data).toString('base64url');
        return id;
    };

    const options = await generateRegistrationOptions({
        rpName: 'Parallel Arena',
        rpID,
        userID: Buffer.from(req.uid, 'utf-8'),
        userName: userData.pseudo || userData.email || 'User',
        attestationType: 'none',
        excludeCredentials: (userData.passkeys || [])
            .map(pk => ({ 
                id: cleanID(pk.credentialID), 
                type: 'public-key' 
            }))
            .filter(c => c.id), // Filtre les IDs invalides ou manquants
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
    
    // DEBUG LOG pour comprendre pourquoi c'est manquant
    if (verified) {
        console.log("[PASSKEY REGISTER DEBUG] Registration Info received:", JSON.stringify(registrationInfo, (key, value) => {
            if (key === 'credentialPublicKey' || key === 'credentialID') {
                return value ? `Buffer(${value.length || 0} bytes)` : 'undefined';
            }
            return value;
        }));
    }

    if (verified && registrationInfo) {
        
        // Helper sécurisé pour la conversion
        const safeToBase64Url = (input) => {
            if (!input) return null;
            if (Buffer.isBuffer(input)) return input.toString('base64url');
            if (typeof input === 'string') return input; 
            // Cas spécifique : Objet Uint8Array sérialisé ou Buffer-like
            if (typeof input === 'object') {
                try {
                    // Si c'est un objet {0: x, 1: y} (Uint8Array JSONifié), on le convertit en tableau
                    const val = Object.values(input); 
                    return Buffer.from(val).toString('base64url');
                } catch(e) {}
            }
            try { return Buffer.from(input).toString('base64url'); } catch(e) { return null; }
        };

        // Extraction intelligente basée sur les logs
        let rawID = registrationInfo.credentialID;
        let rawKey = registrationInfo.credentialPublicKey;

        // Support de la structure imbriquée (v13+ ou format spécifique)
        if (!rawID && registrationInfo.credential && registrationInfo.credential.id) {
            rawID = registrationInfo.credential.id;
        }
        if (!rawKey && registrationInfo.credential && registrationInfo.credential.publicKey) {
            rawKey = registrationInfo.credential.publicKey;
        }

        let credID = safeToBase64Url(rawID);
        // Fallback ultime sur body.id
        if (!credID && body.id) credID = body.id;

        let credKey = safeToBase64Url(rawKey);
        // Fallback ultime sur verification
        if (!credKey && verification.credentialPublicKey) credKey = safeToBase64Url(verification.credentialPublicKey);

        console.log("[PASSKEY DEBUG] Final ID:", credID);
        console.log("[PASSKEY DEBUG] Final Key Length:", credKey ? credKey.length : 0);

        if (!credID || !credKey) {
            console.error("Erreur critique : Données manquantes.");
            console.log("Full Verification Object:", JSON.stringify(verification, null, 2)); // DEBUG FINAL
            return res.status(400).json({ 
                error: `Données incomplètes: ${!credID ? 'ID' : ''} ${!credKey ? 'PublicKey' : ''}`.trim() 
            });
        }

        // CORRECTION CRITIQUE : On sauvegarde en String Base64URL pour éviter la corruption JSON/Buffer
        const newPasskey = {
            credentialID: credID,
            credentialPublicKey: credKey,
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
    
    // Helper pour reconstruire les Buffers corrompus par JSON.stringify
    const reconstructBuffer = (obj) => {
        if (!obj) return obj;
        if (Buffer.isBuffer(obj)) return obj;
        if (obj.type === 'Buffer' && Array.isArray(obj.data)) return Buffer.from(obj.data);
        if (typeof obj === 'string') return obj; // Base64 probablement
        if (typeof obj === 'object') {
            try { return Buffer.from(Object.values(obj)); } catch(e) {}
        }
        return obj;
    };

    const toBase64Url = (obj) => {
        const buf = reconstructBuffer(obj);
        if (Buffer.isBuffer(buf)) return buf.toString('base64url');
        if (typeof buf === 'string') {
            return buf.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        }
        return buf;
    };

    // Recherche de l'utilisateur et de la passkey correspondante
    let userId = null;
    let foundPasskey = null;
    let userFoundByEmail = false;

    // Si l'email est fourni, on optimise la recherche
    if (email) {
        const uid = Object.keys(all).find(id => all[id].email && all[id].email.toLowerCase() === email.toLowerCase());
        if (uid) {
            userFoundByEmail = true;
            const u = all[uid];
            if (u.passkeys) {
                foundPasskey = u.passkeys.find(pk => {
                    return toBase64Url(pk.credentialID) === body.id;
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
                return toBase64Url(k.credentialID) === body.id;
            });
            if (pk) {
                foundPasskey = pk;
                return true;
            }
            return false;
        });
    }

    if (!userId || !foundPasskey) {
        if (email && !userFoundByEmail) return res.status(400).json({ error: "Aucun compte associé à cet email." });
        if (userFoundByEmail && !foundPasskey) return res.status(400).json({ error: "Cette Passkey ne correspond pas à ce compte." });
        return res.status(400).json({ error: "Utilisateur ou Passkey introuvable." });
    }

    // VÉRIFICATION CRYPTOGRAPHIQUE
    try {
        let pubKey = reconstructBuffer(foundPasskey.credentialPublicKey);
        if (!Buffer.isBuffer(pubKey) && typeof pubKey === 'string') {
            pubKey = Buffer.from(pubKey, 'base64url');
        }

        let credID = reconstructBuffer(foundPasskey.credentialID);
        if (!Buffer.isBuffer(credID) && typeof credID === 'string') {
            credID = Buffer.from(credID, 'base64url');
        }

        // Stratégie "Shotgun" : On couvre toutes les conventions de nommage possibles
        // pour s'assurer que la lib trouve les propriétés, peu importe sa version.
        const dbAuth = {
            credentialPublicKey: new Uint8Array(pubKey),
            publicKey: new Uint8Array(pubKey), // Alias
            credentialID: credID,
            id: credID, // Alias
            counter: Number(foundPasskey.counter || 0),
        };

        const verification = await verifyAuthenticationResponse({
            response: body,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            credential: dbAuth,     // Pour v10+
            authenticator: dbAuth,  // Pour versions antérieures (fallback)
        });

        if (verification.verified) {
            // Mise à jour du compteur
            const u = all[userId];
            const pkIndex = u.passkeys.findIndex(pk => pk === foundPasskey);
            if (pkIndex !== -1) {
                 u.passkeys[pkIndex].counter = verification.authenticationInfo.newCounter;
                 await saveUserData(userId, u);
            }
            
            challenges.delete(`auth_pending_${tempId}`);
            
            // Génération du token Firebase pour la session client
            const token = await admin.auth().createCustomToken(userId);
            
            res.json({ success: true, userId, userData: u, token });
        } else {
            res.status(400).json({ error: "Vérification échouée" });
        }
    } catch (error) {
        console.error("Erreur vérification Passkey (Stack):", error);
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
server.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 SERVEUR FULL OP SUR PORT ${PORT}`);
    await cleanupDatabase();
});

// --- DATABASE CLEANUP & MIGRATION ---
async function cleanupDatabase() {
    console.log("[DB] Starting Passkey cleanup & repair...");
    try {
        const users = await loadAllUsersData();
        let updatedCount = 0;

        for (const [uid, user] of Object.entries(users)) {
            if (!user.passkeys || !Array.isArray(user.passkeys)) continue;

            let hasChanges = false;
            const cleanPasskeys = user.passkeys.map(pk => {
                if (!pk) return null;

                let modified = false;
                const newPk = { ...pk };

                // Repair Credential ID
                if (newPk.credentialID && typeof newPk.credentialID === 'object' && newPk.credentialID.type === 'Buffer') {
                    if (Array.isArray(newPk.credentialID.data)) {
                        newPk.credentialID = Buffer.from(newPk.credentialID.data).toString('base64url');
                        modified = true;
                    }
                } else if (Buffer.isBuffer(newPk.credentialID)) {
                    newPk.credentialID = newPk.credentialID.toString('base64url');
                    modified = true;
                }

                // Repair Public Key
                if (newPk.credentialPublicKey && typeof newPk.credentialPublicKey === 'object' && newPk.credentialPublicKey.type === 'Buffer') {
                     if (Array.isArray(newPk.credentialPublicKey.data)) {
                        newPk.credentialPublicKey = Buffer.from(newPk.credentialPublicKey.data).toString('base64url');
                        modified = true;
                     }
                } else if (Buffer.isBuffer(newPk.credentialPublicKey)) {
                    newPk.credentialPublicKey = newPk.credentialPublicKey.toString('base64url');
                    modified = true;
                }

                if (modified) hasChanges = true;
                return newPk;
            }).filter(pk => pk && pk.credentialID); // Remove nulls and empty IDs

            if (hasChanges || cleanPasskeys.length !== user.passkeys.length) {
                user.passkeys = cleanPasskeys;
                await saveUserData(uid, user);
                updatedCount++;
                console.log(`[DB] Repaired passkeys for user: ${uid} (${user.pseudo || 'No Pseudo'})`);
            }
        }
        console.log(`[DB] Cleanup complete. ${updatedCount} users updated.`);
    } catch (e) {
        console.error("[DB] Cleanup failed:", e);
    }
}

function generateSurvivalOpponent(wave) {
    const names = Object.keys(OPPONENT_STATS_RANGES), name = names[Math.floor(Math.random() * names.length)], stats = OPPONENT_STATS_RANGES[name], scale = 1 + (wave - 1) * 0.1;
    return { name, pv: Math.round(stats.minPv * scale), pv_maximum: Math.round(stats.minPv * scale), pv_max: Math.round(stats.minPv * scale), attaque: Math.round(stats.minAttaque * scale), attaque_originale: Math.round(stats.minAttaque * scale), defense: Math.round(stats.minDefense * scale), defense_originale: Math.round(stats.minDefense * scale), vitesse: stats.vitesse, vitesse_originale: stats.vitesse, critique: 0, critique_originale: 0, spe: 0, equipments: [], effects: [] };
}