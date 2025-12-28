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

if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const serviceAccount = require(path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} else if (fs.existsSync('./serviceAccountKey.json')) {
    const serviceAccount = require("./serviceAccountKey.json");
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const app = express();
app.set('trust proxy', 1); // Faire confiance au tunnel (localtunnel/ngrok)
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// --- ONLINE USERS TRACKING ---
const onlineUsers = new Map(); // socket.id -> { userId, lastSeen }

io.on('connection', (socket) => {
    socket.on('register', (data) => {
        if (data.userId) {
            onlineUsers.set(socket.id, { userId: data.userId, lastSeen: Date.now() });
            console.log(`[ONLINE] User ${data.userId} connected`);
        }
    });

    socket.on('disconnect', () => {
        const info = onlineUsers.get(socket.id);
        if (info) {
            onlineUsers.delete(socket.id);
            console.log(`[ONLINE] User ${info.userId} disconnected`);
        }
    });
});

// --- PASSKEY CONFIG (DYNAMIQUE) ---
const RP_NAME = "Willy0's Parallel Arena";
const challenges = new Map(); // Store challenges by userId/session

function getWebAuthnConfig(req) {
    const host = req.headers.host; // ex: localhost:3000 ou willy.localtunnel.me
    const rpID = host.split(':')[0];
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const origin = `${protocol}://${host}`;
    return { rpID, origin };
}

// --- ADMIN API: ONLINE STATUS ---
app.get('/api/admin/online', verifyToken, verifyAdmin, (req, res) => {
    const users = loadAllUsersData();
    const active = [];
    const uniqueIds = new Set();

    onlineUsers.forEach(info => {
        if (!uniqueIds.has(info.userId)) {
            uniqueIds.add(info.userId);
            const u = users[info.userId] || {};
            active.push({
                uid: info.userId,
                pseudo: u.pseudo || 'Anonyme',
                lastSeen: info.lastSeen
            });
        }
    });

    res.json({ 
        success: true, 
        count: uniqueIds.size,
        users: active 
    });
});

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || "6LcMZzcsAAAAABJNQwfd8Azzi45yk-KT86hK437W"; // REMPLACER PAR VOTRE CLÉ SECRÈTE

async function verifyRecaptcha(token, userId = null) {
    // 1. DÉTECTION DES BYPASS DYNAMIQUES
    if (token && (token.startsWith("timeout_grecaptcha_") || token.startsWith("no_grecaptcha_"))) {
        const parts = token.split("_");
        const timestamp = parseInt(parts[parts.length - 1]);
        const now = Date.now();

        // Le jeton de bypass expire après 30 secondes pour éviter le "replay"
        if (isNaN(timestamp) || (now - timestamp) > 30000 || (now - timestamp) < -5000) {
            console.warn(`[reCAPTCHA] Bypass expiré ou invalide pour ${userId}`);
            return { success: false, error: "Session de sécurité expirée. Réessayez." };
        }

        console.log(`[reCAPTCHA] Bypass dynamique accepté pour ${userId || 'Inconnu'}. Délai de sécurité appliqué.`);
        
        // --- BARRIÈRE ANTI-BOT ---
        // On force une attente de 2 secondes. Invisible pour l'humain, mortel pour le spam de bots.
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return { success: true, score: 0.3, bypassed: true };
    }

    // Anciens jetons statiques ou de dev (à garder uniquement si nécessaire pour le dev)
    if (token === "DEV_BYPASS_TOKEN") return { success: true, score: 1.0, bypassed: true };

    try {
        const params = new URLSearchParams();
        params.append('secret', RECAPTCHA_SECRET_KEY);
        params.append('response', token);

        const response = await axios.post(
            'https://www.google.com/recaptcha/api/siteverify',
            params.toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        
        const data = response.data;
        const score = data.score;

        if (data.success && score >= 0.3) {
            console.log(`[reCAPTCHA] Validation réussie. Score : ${score} (${userId || 'Inconnu'})`);
            return { success: true, score: score };
        } else {
            const errors = data['error-codes'] || ['unknown-error'];
            
            // Si l'erreur est 'browser-error', c'est que Google bloque l'environnement (PWA/IP).
            // On autorise avec un avertissement pour le développement.
            if (errors.includes('browser-error')) {
                console.warn(`[reCAPTCHA] Environnement bloqué par Google (browser-error). Autorisation exceptionnelle.`);
                return { success: true, score: 0.3, bypassed: true };
            }

            console.warn(`[reCAPTCHA] Échec. Erreurs : ${errors.join(', ')} | Score : ${score}`);
            return { success: false, error: `Vérification échouée (${errors[0]}).` };
        }
    } catch (error) {
        console.error("[reCAPTCHA] Erreur API Google:", error.message);
        return { success: false, error: "Erreur lors de la vérification de sécurité." };
    }
}

const PORT = process.env.PORT || 3000;

// --- CONFIGURATION DES CHEMINS ---
// DATA_DIR permet de stocker les données persistantes sur un disque externe (Render Disk)
const DATA_DIR = process.env.DATA_DIR || __dirname;

const DATA_FILE = path.join(DATA_DIR, 'users_data.json');
const NEWS_FILE = path.join(DATA_DIR, 'news.json');
const AI_MODEL_FILE = path.join(DATA_DIR, 'ai_model.json');
const SERVER_CONFIG_FILE = path.join(DATA_DIR, 'server_config.json');

// Les fichiers statiques (données du jeu) restent dans le dossier 'data' de l'application
const TROPHY_ROAD_FILE = path.join(__dirname, 'data', 'trophy_road.json');
const PASS_REWARDS_FILE = path.join(__dirname, 'data', 'pass_rewards.json');
const SURVIVAL_OPPONENTS_FILE = path.join(__dirname, 'data', 'survival_opponents.json');
const EQUIPMENTS_FILE = path.join(__dirname, 'data', 'equipments.json');

function loadServerConfig() {
    if (!fs.existsSync(SERVER_CONFIG_FILE)) return { maintenance: false };
    try { return JSON.parse(fs.readFileSync(SERVER_CONFIG_FILE, 'utf8')); } catch (e) { return { maintenance: false }; }
}
function saveServerConfig(data) {
    try { fs.writeFileSync(SERVER_CONFIG_FILE, JSON.stringify(data, null, 2), 'utf8'); } catch (e) {}
}
function loadJSONData(filePath, defaultVal) {
    if (!fs.existsSync(filePath)) return defaultVal;
    try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (e) { console.error(`Error loading ${filePath}:`, e); return defaultVal; }
}

const TROPHY_ROAD = loadJSONData(TROPHY_ROAD_FILE, []);
const PASS_REWARDS = loadJSONData(PASS_REWARDS_FILE, { free: [], premium: [] });
const OPPONENT_STATS_RANGES = loadJSONData(SURVIVAL_OPPONENTS_FILE, {});

// --- SECURITY MIDDLEWARE ---
app.use(helmet({
    contentSecurityPolicy: false, // Disabled for compatibility with inline scripts/styles in this project structure
}));

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Limit each IP to 500 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', apiLimiter);

app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// --- AI API Endpoints ---
app.get('/api/ai/load', (req, res) => {
    if (fs.existsSync(AI_MODEL_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(AI_MODEL_FILE, 'utf8'));
            res.json({ success: true, models: data });
        } catch (e) {
            console.error("Error loading AI model:", e);
            res.json({ success: false, error: "Failed to parse AI model" });
        }
    } else {
        res.json({ success: false, error: "AI model not found" });
    }
});

app.post('/api/ai/save', (req, res) => {
    try {
        const { model } = req.body; 
        let currentData = {};
        if (fs.existsSync(AI_MODEL_FILE)) {
            try {
                currentData = JSON.parse(fs.readFileSync(AI_MODEL_FILE, 'utf8'));
            } catch (e) {}
        }
        
        if (req.body.model && req.body.characterName) {
             currentData[req.body.characterName] = req.body.model;
        } else if (req.body.model) {
             currentData["UNIVERSAL"] = req.body.model;
        }

        fs.writeFileSync(AI_MODEL_FILE, JSON.stringify(currentData, null, 2), 'utf8');
        res.json({ success: true });
    } catch (e) {
        console.error("Error saving AI model:", e);
        res.json({ success: false, error: "Failed to save AI model" });
    }
});

// --- Constantes et Utilitaires ---
const WEEKEND_EVENTS = ["PV égaux", "Chargement /2", "Sans défense", "Sans objet", "Points X2", "XP X2", "Rage", "Armure fragile", "Récupération rapide", "Malédiction", "Bénédiction"];

// --- PUBLIC API: PSEUDO CHECK ---
app.get('/api/check-pseudo/:pseudo', (req, res) => {
    try {
        const users = loadAllUsersData();
        const pseudoToCheck = req.params.pseudo.trim().toLowerCase();
        
        const exists = Object.values(users).some(u => 
            u.pseudo && u.pseudo.trim().toLowerCase() === pseudoToCheck
        );

        console.log(`[PSEUDO] Vérification de "${pseudoToCheck}" : ${exists ? 'PRIS' : 'LIBRE'}`);
        res.json({ available: !exists });
    } catch (e) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

async function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const requestedUserId = req.params.userId || (req.body ? req.body.userId : null);
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Allow public read for maintenance status without token
        if (req.path === '/api/config/maintenance') return next();
        console.warn("[AUTH] Header manquant ou malformé");
        return res.status(401).json({ error: "Authentification requise" });
    }
    const token = authHeader.split('Bearer ')[1];
    try {
        if (!admin.apps.length) return next();
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        // Attach UID to request for downstream use
        req.uid = decodedToken.uid;

        if (requestedUserId && requestedUserId !== decodedToken.uid) {
            // Special exception: Admins can act on behalf of others
            const users = loadAllUsersData();
            if (users[decodedToken.uid] && users[decodedToken.uid].isAdmin) {
                // Admin pass
            } else {
                console.warn(`[AUTH] ID mismatch: Req=${requestedUserId}, Token=${decodedToken.uid}`);
                return res.status(403).json({ error: "Accès refusé" });
            }
        }
        next();
    } catch (error) { 
        console.error("[AUTH] Erreur de vérification:", error.code || error.message);
        res.status(401).json({ error: "Session invalide" }); 
    }
}

function verifyAdmin(req, res, next) {
    const users = loadAllUsersData();
    const userData = users[req.uid];
    if (userData && userData.isAdmin) {
        next();
    } else {
        res.status(403).json({ error: "Droits administrateur requis" });
    }
}

function loadAllUsersData() { if (!fs.existsSync(DATA_FILE)) return {}; try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) { return {}; } }
function saveAllUsersData(data) { try { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8'); } catch (e) {} }

function generateSurvivalOpponent(wave) {
    const names = Object.keys(OPPONENT_STATS_RANGES);
    const name = names[Math.floor(Math.random() * names.length)];
    const stats = OPPONENT_STATS_RANGES[name];
    const scale = 1 + (wave - 1) * 0.1;
    return { name, pv: Math.round(stats.minPv * scale), pv_maximum: Math.round(stats.minPv * scale), pv_max: Math.round(stats.minPv * scale), attaque: Math.round(stats.minAttaque * scale), attaque_originale: Math.round(stats.minAttaque * scale), defense: Math.round(stats.minDefense * scale), defense_originale: Math.round(stats.minDefense * scale), vitesse: stats.vitesse, vitesse_originale: stats.vitesse, critique: 0, critique_originale: 0, spe: 0, equipments: [], effects: [] };
}

// --- LOGIQUE DE RÉCOMPENSES AVANCÉE ---

function getTrophyRoadRewards() {
    return [
        { trophies: 10, rewards: [{ type: 'coins', amount: 20 }] },
        { trophies: 20, rewards: [{ type: 'item', id: 'Potion_de_Santé_acheté', amount: 1 }] },
        { trophies: 40, rewards: [{ type: 'item', id: 'epee_tranchante_acheté', amount: 1 }] },
        { trophies: 65, rewards: [{ type: 'item', id: 'bouclier_solide_acheté', amount: 1 }] },
        { trophies: 80, rewards: [{ type: 'coins', amount: 75 }] },
        { trophies: 120, rewards: [{ type: 'coins', amount: 100 }] },
        { trophies: 200, rewards: [{ type: 'coins', amount: 150 }] },
        { trophies: 300, rewards: [{ type: 'coins', amount: 200 }] }
    ];
}

function updateParallelPass(userData, gainXP) {
    if (gainXP > 0) userData.pass_XP = (userData.pass_XP || 0) + gainXP;
    const calcNext = (lvl) => Math.round((50 + (lvl * 20)) * 1.1);
    
    // Catch up levels if XP is already higher than required
    while ((userData.pass_XP || 0) >= calcNext(userData.pass_level || 0)) {
        const cost = calcNext(userData.pass_level || 0);
        userData.pass_level = (userData.pass_level || 0) + 1;
        userData.pass_XP -= cost;
    }
}

function updateQuests(userData, game, isPlayerWinner) {
    const player = game.player;
    const mode = game.gameMode;
    console.log(`[UpdateQuests] Mode: ${mode}, Winner: ${isPlayerWinner}, Player: ${player.name}`);
    console.log(`[UpdateQuests] Player Stats: Degats=${player.degats_partie}, Objets=${player.objets_partie}, Defense=${player.defense_partie}`);

    // Helper to process a single quest
    const processQuest = (id) => {
        if (userData[`${id}_completed`]) return;
        const type = userData[`${id}_type`];
        const char = userData[`${id}_character`];
        
        if (!type) return; // Skip if no quest assigned to this slot

        let progress = 0;
        // console.log(`[UpdateQuests] Checking ${id}: Type=${type}, Char=${char}`);

        switch (type) {
            // ... (rest of the switch)
            // --- DAILY QUESTS ---
            case "victoire_classique": 
                if (isPlayerWinner && player.name === char && mode === 'classic') progress = 1; 
                break;
            case "dommages_classique": 
                if (mode === 'classic') progress = (player.degats_partie || 0); 
                break;
            case "objets_total": 
                progress = (player.objets_partie || 0); 
                break;
            case "manches_survie": 
                if (mode === 'survie') progress = (game.wave || 0); 
                break;
            case "defense_classique": 
                if (mode === 'classic') progress = (player.defense_partie || 0); 
                break;

            // --- WEEKEND QUESTS ---
            case "VCW": // Victoire Classique Weekend (Gagner avec X en mode Weekend)
                if (isPlayerWinner && player.name === char && mode === 'weekend') progress = 1;
                break;
            case "DCW": // Dégâts Classique Weekend (Infliger X dégâts en mode Weekend)
                if (mode === 'weekend') progress = (player.degats_partie || 0);
                break;
            case "OW": // Objets Weekend
                if (mode === 'weekend') progress = (player.objets_partie || 0);
                break;
            case "DECW": // Défense Weekend
                if (mode === 'weekend') progress = (player.defense_partie || 0);
                break;

            // --- WEEKLY QUESTS ---
            case "VPCS": // Gagner X parties avec Y en mode classique
                if (isPlayerWinner && player.name === char && mode === 'classic') progress = 1;
                break;
            case "SPS": // Survivre X manches en mode survie avec Y
                if (mode === 'survie' && player.name === char) progress = (game.wave || 0);
                break;
            case "VCS": // Gagner X parties en mode classique
                if (isPlayerWinner && mode === 'classic') progress = 1;
                break;
            case "DSC": // Infliger X dégâts en mode classique
                if (mode === 'classic') progress = (player.degats_partie || 0);
                break;
            case "O": // Utiliser X objets (Any mode?) - Usually implies classic/any
                progress = (player.objets_partie || 0);
                break;
            case "SS": // Survivre à X manches en mode survie
                if (mode === 'survie') progress = (game.wave || 0);
                break;
            case "DC": // Se défendre X fois en mode classique
                if (mode === 'classic') progress = (player.defense_partie || 0);
                break;
            case "CC": // Utiliser X capacités spéciales en mode classique
                if (mode === 'classic') progress = (player.capacite_partie || 0);
                break;
            case "DS": // Infliger X dégâts en mode survie
                if (mode === 'survie') progress = (player.degats_partie || 0);
                break;
            case "CS": // Utiliser la capacité spéciale X fois en mode survie
                if (mode === 'survie') progress = (player.capacite_partie || 0);
                break;
            case "CRC": // Faire X coups critiques (Any mode)
                progress = (player.coups_critiques_partie || 0);
                break;
            case "BSC": // Bloquer X capacités spéciales (Countering)
                // Note: opponent.special_countered_partie tracks when OPPONENT special is countered by PLAYER
                // So if the quest is "Bloquer X capacités", it means the player blocked them.
                // We stored it on the opponent because that's who used the special.
                // But wait, combat-engine-server logic: 
                // if (!isPlayer) { opponent.special_countered_partie++ } -> when Opponent uses special and Player blocks.
                // So we check game.opponent.special_countered_partie.
                progress = (game.opponent.special_countered_partie || 0);
                break;
        }

        if (progress > 0) {
            userData[`${id}_current`] = (userData[`${id}_current`] || 0) + progress;
        }
    };

    // 1. Process Daily Quests
    ['quete1', 'quete2', 'quete3'].forEach(processQuest);

    // 2. Process Weekend Quests
    ['weekend-quete1', 'weekend-quete2', 'weekend-quete3'].forEach(processQuest);

    // 3. Process Weekly Quests (Check all 9 weeks x 5 quests)
    for (let week = 1; week <= 9; week++) {
        for (let i = 1; i <= 5; i++) {
            processQuest(`Semaine${week}_${i}`);
        }
    }
}

function finalizeGame(userId, game, results) {
    const users = loadAllUsersData();
    const userData = users[userId];
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
        const testKey = (game.gameMode === 'weekend') ? 'parties_weekend_test' : 'parties_test';
        if ((userData[testKey] || 0) < 1) { gain_xp = 0; gain_argent = 0; userData[testKey] = 1; }
        if (userData.XP_jour >= 2500) gain_xp = 0; else userData.XP_jour = (userData.XP_jour || 0) + gain_xp;
        gain_trophees = isPlayerWinner ? 10 : (userData.trophees < 150 ? -1 : (userData.trophees <= 300 ? -5 : -10));
    }

    // --- WEEKEND EVENT BONUSES ---
    if (game.gameMode === 'weekend' && game.event) {
        if (game.event === 'XP X2') gain_xp *= 2;
        if (game.event === 'Points X2') gain_argent *= 2;
    }

    if (userData.Double_XP > 0 && gain_xp > 0) { gain_xp *= 2; userData.Double_XP--; }
    
    userData.argent = (userData.argent || 0) + gain_argent;
    userData.trophees = Math.max(0, (userData.trophees || 0) + gain_trophees);
    
    // Track Maximum Trophies
    if ((userData.trophees || 0) > (userData.tropheesMax || 0)) {
        userData.tropheesMax = userData.trophees;
    }

    userData[player.name + "_XP"] = (userData[player.name + "_XP"] || 0) + gain_xp;
    
    // Track Wins and Losses
    if (game.gameMode === 'survie') {
        if (game.wave > (userData.manches_max || 0)) {
            userData.manches_max = game.wave;
        }
    } else {
        if (isPlayerWinner) {
            userData.victoires = (userData.victoires || 0) + 1;
        } else {
            userData.defaites = (userData.defaites || 0) + 1;
        }
    }

    userData.fin_xp = gain_xp;
    userData.fin_argent = gain_argent;
    userData.fin_trophee = gain_trophees;

    updateParallelPass(userData, gain_xp);
    updateQuests(userData, game, isPlayerWinner);
    
    results.masteryGameResult = combatEngine.updateMastery(userData, player.name, { gameMode: game.gameMode, hpPercentage: (player.pv / (player.pv_maximum || 1)) * 100, damageDealt: player.degats_partie || 0, damageTaken: 500, wavesCleared: game.wave });
    
    games.delete(userId);
    saveAllUsersData(users);
    results.updatedUserData = userData;
}

// --- DATA: TROPHY ROAD REWARDS ---
// --- CONSTANTS ---
const ITEM_PROPERTY_MAP = {
    xp: 'Double_XP_acheté',
    xp_2: 'Double_XP_acheté', // Alias from menu_principal.js
    potion: 'Potion_de_Santé_acheté',
    amulette: 'Amulette_de_Régénération_acheté',
    epee: 'epee_tranchante_acheté',
    elixir: 'elixir_puissance_acheté',
    armure: 'armure_fer_acheté',
    bouclier: 'bouclier_solide_acheté',
    cape: 'Cape_acheté',
    crystal: 'crystal_acheté',
    marque_chasseur: 'marque_chasseur_acheté',
    purge_spirituelle: 'purge_spirituelle_acheté',
    orbe_siphon: 'orbe_siphon_acheté'
};

function getProceduralTrophyReward(trophies) {
    if (trophies < 2000) return null;
    const milestone = Math.floor(trophies / 100) * 100;
    if (milestone !== trophies) return null; // Ensure exact match
    const cycle = (milestone / 100) % 10; 
    let reward;
    const amountMultiplier = Math.floor(milestone / 1000);

    switch (cycle) {
        case 1: reward = { type: 'coins', amount: 100 + 100 * amountMultiplier }; break;
        case 2: 
            const items = ['potion', 'epee', 'elixir', 'bouclier'];
            const randomItem = items[Math.floor(Math.random() * items.length)];
            reward = { type: 'item', id: randomItem, amount: 5 + amountMultiplier }; break;
        case 3: reward = { type: 'coins', amount: 200 + 150 * amountMultiplier }; break;
        case 4: 
            const chests = ['Attaque', 'Défense', 'Agilité', 'Équilibre'];
            const randomChest = chests[Math.floor(Math.random() * chests.length)];
            reward = { type: 'chest', chestType: randomChest }; break;
        case 5: reward = { type: 'coins', amount: 400 + 250 * amountMultiplier }; break;
        case 6: 
            const rareItems = ['amulette', 'cape', 'armure', 'crystal'];
            const randomRareItem = rareItems[Math.floor(Math.random() * rareItems.length)];
            reward = { type: 'item', id: randomRareItem, amount: 3 + amountMultiplier }; break;
        case 7: reward = { type: 'coins', amount: 600 + 300 * amountMultiplier }; break;
        case 8: reward = { type: 'random_chest' }; break;
        case 9: reward = { type: 'coins', amount: 800 + 400 * amountMultiplier }; break;
        case 0: reward = { type: 'random_character' }; break;
        default: return null;
    }
    return { trophies: milestone, rewards: [reward] };
}

// --- CLAIM SYSTEMS ---

app.post('/api/trophy/claim', verifyToken, async (req, res) => {
    const { userId, milestone, recaptchaToken } = req.body;
    const botCheck = await verifyRecaptcha(recaptchaToken, userId);
    if (!botCheck.success) return res.status(403).json({ error: botCheck.error });

    const users = loadAllUsersData();
    const userData = users[userId];
    if (!userData) return res.status(404).json({ error: "Utilisateur introuvable" });

    const ms = parseInt(milestone);
    if (userData[`trophy_claimed_${ms}`]) return res.status(400).json({ error: "Déjà récupéré" });
    if ((userData.trophees || 0) < ms) {
        console.warn(`[TROPHY] ${userId} tried to claim ${ms} but has ${userData.trophees}`);
        return res.status(400).json({ error: "Trophées insuffisants" });
    }

    let config = TROPHY_ROAD.find(m => m.trophies === ms);
    if (!config) config = getProceduralTrophyReward(ms);
    
    if (!config) {
        console.warn(`[TROPHY] Invalid milestone ${ms} requested by ${userId}`);
        return res.status(400).json({ error: "Palier invalide" });
    }

    config.rewards.forEach(r => {
        if (r.type === 'coins') userData.argent = (userData.argent || 0) + r.amount;
        if (r.type === 'item') {
            const prop = ITEM_PROPERTY_MAP[r.id];
            if (prop) userData[prop] = (userData[prop] || 0) + r.amount;
        }
        if (r.type === 'random' || r.type === 'random_reward') userData.recompense = (userData.recompense || 0) + 1;
        if (r.type === 'character_random' || r.type === 'random_character') userData.perso_recompense = (userData.perso_recompense || 0) + 1;
        // Handle chests/lootboxes by saving a pending open action or just incrementing a counter?
        // The client expects immediate opening usually for lootboxes, but here it's passive claim.
        // We don't have a "chest inventory". 
        // Logic: Add to `sessionStorage` boxesToOpen? No, we are on server.
        // We can add a specialized flag or just trigger a "lootbox_credit"?
        // Simpler: Just give the lootbox content directly? No, requires random generation.
        // Let's store it in a specific queue for the user to open?
        // Existing shop logic uses `sessionStorage` 'boxesToOpen' on client.
        // We can return `extra: { openBox: type }` and let client handle the transition.
        
        // However, for consistency with `api/pass/claim`, we might want to return `extra`.
    });

    userData[`trophy_claimed_${ms}`] = true;
    saveAllUsersData(users);
    
    // Check if we need to trigger a lootbox open on client
    let extra = {};
    const chestReward = config.rewards.find(r => r.type === 'chest');
    if (chestReward) extra.openBox = chestReward.chestType;
    
    res.json({ success: true, userData: userData, extra: extra });
});

app.post('/api/recompenses/open', verifyToken, async (req, res) => {
    const { userId, recaptchaToken } = req.body;
    const botCheck = await verifyRecaptcha(recaptchaToken, userId);
    if (!botCheck.success) return res.status(403).json({ error: botCheck.error });

    const users = loadAllUsersData();
    const userData = users[userId];
    if (!userData) return res.status(404).json({ error: "Utilisateur introuvable" });

    const forceCharacter = (userData.perso_recompense > 0);
    if (!forceCharacter && (userData.recompense || 0) <= 0) {
        return res.status(400).json({ error: "Pas de récompense en attente" });
    }

    let rewards = [];
    const numToGenerate = forceCharacter ? 1 : (Math.random() < 0.7 ? 1 : (Math.random() < 0.9 ? 2 : 3));

    // Liste des personnages (Simplifiée pour le serveur)
    const ALL_CHARS = ["Willy", "Cocobi", "Oiseau", "Grours", "Baleine", "Doudou", "Coeur", "Diva", "Poulpy", "Colorina", "Rosalie", "Sboonie", "Inconnu", "Boompy", "Perro", "Nautilus", "Paradoxe", "Korb"];

    for (let i = 0; i < numToGenerate; i++) {
        let selected = null;
        
        if (forceCharacter || Math.random() < 0.06) {
            // Tirage Personnage
            const locked = ALL_CHARS.filter(c => !userData[c]);
            if (locked.length > 0) {
                const name = locked[Math.floor(Math.random() * locked.length)];
                userData[name] = 1;
                selected = { id: name, name: name, type: 'character', info: "Nouveau Personnage !" };
            } else {
                selected = { id: 'argent', name: 'Points', amount: 100, info: "Bonus (Tous persos possédés)" };
            }
        } else {
            // Tirage Item / Argent / XP
            const pool = [
                { id: 'Potion_de_Santé_acheté', name: 'Potion de Santé', weight: 20, amount: 1 },
                { id: 'argent', name: 'Points', weight: 20, amount: 25 },
                { id: 'epee_tranchante_acheté', name: 'Épée Tranchante', weight: 15, amount: 1 },
                { id: 'Double_XP_acheté', name: 'Double XP', weight: 15, amount: 2 },
                { id: 'Cape_acheté', name: 'Cape de l\'ombre', weight: 5, amount: 1 },
                { id: 'crystal_acheté', name: 'Cristal de renouveau', weight: 10, amount: 1 },
                { id: 'xp', name: 'XP Personnage', weight: 15, amount: 50 }
            ];
            const totalWeight = pool.reduce((sum, r) => sum + r.weight, 0);
            let r = Math.random() * totalWeight;
            for (const item of pool) {
                if (r < item.weight) { selected = item; break; }
                r -= item.weight;
            }
        }

        // Application
        if (selected.type === 'character') {
            // Déjà fait au dessus
        } else if (selected.id === 'argent') {
            userData.argent = (userData.argent || 0) + selected.amount;
        } else if (selected.id === 'xp') {
            const owned = ALL_CHARS.filter(c => userData[c] === 1);
            const target = owned[Math.floor(Math.random() * owned.length)] || "Willy";
            userData[target + "_XP"] = (userData[target + "_XP"] || 0) + selected.amount;
            selected.name = `${target} XP`;
        } else {
            userData[selected.id] = (userData[selected.id] || 0) + (selected.amount || 1);
        }
        rewards.push(selected);
    }

    if (forceCharacter) userData.perso_recompense--;
    else userData.recompense--;

    saveAllUsersData(users);
    res.json({ success: true, userData: userData, rewards: rewards });
});

// =================== PASSKEY ENDPOINTS ===================

// 1. Démarrer l'enregistrement d'une Passkey
app.post('/api/passkey/register-options', verifyToken, async (req, res) => {
    const userId = req.uid;
    const users = loadAllUsersData();
    const user = users[userId];
    const { rpID } = getWebAuthnConfig(req);

    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

    const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: rpID,
        userID: Uint8Array.from(userId, c => c.charCodeAt(0)),
        userName: user.pseudo || user.email,
        attestationType: 'none',
        authenticatorSelection: {
            residentKey: 'preferred',
            userVerification: 'preferred',
        },
    });

    challenges.set(`reg_${userId}`, options.challenge);
    res.json(options);
});

// 2. Vérifier et enregistrer la Passkey
app.post('/api/passkey/register-verify', verifyToken, async (req, res) => {
    const userId = req.uid;
    const { body, email } = req.body; 
    const { rpID, origin } = getWebAuthnConfig(req);
    const expectedChallenge = challenges.get(`reg_${userId}`);

    if (!expectedChallenge) return res.status(400).json({ error: "Challenge expiré" });

    try {
        const verification = await verifyRegistrationResponse({
            response: body,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
        });

        if (verification.verified) {
            const users = loadAllUsersData();
            const { registrationInfo } = verification;
            
            if (!registrationInfo || !registrationInfo.credential) {
                console.error("[PASSKEY] Données credential manquantes");
                return res.status(400).json({ error: "Données d'enregistrement invalides" });
            }

            if (!users[userId].passkeys) users[userId].passkeys = [];
            
            const { credential } = registrationInfo;

            // Enregistrement de la clé publique
            users[userId].passkeys.push({
                credentialID: credential.id,
                publicKey: Buffer.from(credential.publicKey).toString('base64'),
                counter: credential.counter,
                transports: body.response.transports || [],
            });

            // ON ASSURE QUE L'EMAIL EST BIEN LIÉ AU COMPTE
            if (email) users[userId].email = email.toLowerCase().trim();

            saveAllUsersData(users);
            challenges.delete(`reg_${userId}`);
            res.json({ success: true });
        } else {
            res.status(400).json({ error: "Vérification échouée" });
        }
    } catch (error) {
        console.error("[PASSKEY] Erreur verification:", error);
        res.status(500).json({ error: error.message });
    }
});

// 3. Démarrer la connexion par Passkey (Public)
app.post('/api/passkey/login-options', async (req, res) => {
    let { email } = req.body;
    const { rpID } = getWebAuthnConfig(req);
    const users = loadAllUsersData();

    if (!email) {
        // Flux "Usernameless" / Conditional UI
        const options = await generateAuthenticationOptions({
            rpID,
            userVerification: 'preferred',
        });
        
        // On génère un ID temporaire pour retrouver le challenge plus tard
        const tempId = Math.random().toString(36).substring(7);
        challenges.set(`auth_pending_${tempId}`, options.challenge);
        
        return res.json({ ...options, tempId });
    }
    
    // Flux classique avec Email
    email = email.toLowerCase().trim();
    const userId = Object.keys(users).find(uid => 
        users[uid].email && users[uid].email.toLowerCase().trim() === email
    );

    if (!userId || !users[userId].passkeys || users[userId].passkeys.length === 0) {
        return res.status(404).json({ error: "Pas de Passkey pour ce compte" });
    }

    const options = await generateAuthenticationOptions({
        rpID: rpID,
        allowCredentials: users[userId].passkeys.map(pk => ({
            id: pk.credentialID, // Utilisation directe car c'est déjà une string/base64URL
            type: 'public-key',
            transports: pk.transports,
        })),
        userVerification: 'preferred',
    });

    challenges.set(`auth_${email}`, options.challenge);
    res.json(options);
});

    // 4. Vérifier la connexion par Passkey
app.post('/api/passkey/login-verify', async (req, res) => {
    const { email, body, tempId } = req.body;
    const users = loadAllUsersData();
    const { rpID, origin } = getWebAuthnConfig(req);
    
    let userId = null;
    let expectedChallenge = null;
    let challengeKey = null;

    // 1. Stratégie de récupération de l'utilisateur et du challenge
    if (email) {
        // Cas classique : Email fourni
        userId = Object.keys(users).find(uid => users[uid].email === email);
        challengeKey = `auth_${email}`;
        expectedChallenge = challenges.get(challengeKey);
    } else if (tempId && body && body.id) {
        // Cas Conditional UI : Pas d'email, on cherche par Credential ID
        challengeKey = `auth_pending_${tempId}`;
        expectedChallenge = challenges.get(challengeKey);
        
        // Recherche de l'utilisateur qui possède ce Credential ID
        userId = Object.keys(users).find(uid => {
            return users[uid].passkeys && users[uid].passkeys.some(pk => pk.credentialID === body.id || pk.credentialID === body.rawId);
        });
    }

    console.log(`[PASSKEY] Login verify for ${email || 'Conditional'} (UID: ${userId})`);

    if (!userId || !expectedChallenge) {
        console.warn("[PASSKEY] Session expirée ou utilisateur introuvable");
        return res.status(400).json({ error: "Session expirée ou invalide" });
    }

    const userPasskeys = users[userId].passkeys || [];
    // Recherche de la passkey (on compare les IDs brute ou base64)
    const passkey = userPasskeys.find(pk => pk.credentialID === body.id || pk.credentialID === body.rawId);

    if (!passkey) return res.status(400).json({ error: "Passkey introuvable" });

    try {
        const credentialID = Buffer.from(passkey.credentialID, 'base64url');
        const credentialPublicKey = Buffer.from(passkey.publicKey, 'base64');
        const counter = typeof passkey.counter === 'number' ? passkey.counter : 0;

        const verification = await verifyAuthenticationResponse({
            response: body,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            credential: {
                id: credentialID,
                publicKey: credentialPublicKey,
                counter: counter,
                transports: passkey.transports,
            },
        });

        if (verification.verified) {
            // Mise à jour du compteur
            passkey.counter = verification.authenticationInfo.newCounter;
            saveAllUsersData(users);
            challenges.delete(challengeKey);

            // On renvoie l'UID pour que le client puisse finir le login via Firebase custom token ou autre
            // Ici on va simuler un token ou renvoyer les données utilisateur directement
            res.json({ success: true, userId: userId, userData: users[userId] });
        } else {
            res.status(400).json({ error: "Échec authentification" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// =================== AUTHORITATIVE ENDPOINTS ===================

// 1. SHOP SYSTEM
app.post('/api/shop/buy', verifyToken, async (req, res) => {
    const { userId, type, itemId, quantity, price, recaptchaToken } = req.body;
    
    if (!recaptchaToken) {
        console.warn(`[SHOP] Token reCAPTCHA manquant pour ${userId}`);
        return res.status(403).json({ error: "Token de sécurité manquant. Rafraîchissez la page." });
    }

    // reCAPTCHA Check
    const botCheck = await verifyRecaptcha(recaptchaToken, userId);
    if (!botCheck.success) return res.status(403).json({ error: botCheck.error });

    const users = loadAllUsersData();
    const userData = users[userId];
    
    if (!userData) return res.status(404).json({ error: "Utilisateur introuvable" });
    if ((userData.argent || 0) < price) return res.status(400).json({ error: "Solde insuffisant" });

    // Validate Item (Ideally load from a shop-items.json, but using map for now)
    const ITEM_PROPERTY_MAP = {
        xp: 'Double_XP_acheté',
        potion: 'Potion_de_Santé_acheté',
        amulette: 'Amulette_de_Régénération_acheté',
        epee: 'epee_tranchante_acheté',
        elixir: 'elixir_puissance_acheté',
        armure: 'armure_fer_acheté',
        bouclier: 'bouclier_solide_acheté',
        cape: 'Cape_acheté',
        crystal: 'crystal_acheté',
        marque_chasseur: 'marque_chasseur_acheté',
        purge_spirituelle: 'purge_spirituelle_acheté',
        orbe_siphon: 'orbe_siphon_acheté'
    };

    userData.argent -= price;
    let newBalance = userData.argent;
    let itemAdded = null;

    if (type === 'equipment') {
        if (!userData.equipments) userData.equipments = [];
        if (userData.equipments.includes(itemId)) return res.status(400).json({ error: "Objet déjà possédé" });
        userData.equipments.push(itemId);
        itemAdded = itemId;
    } else {
        const prop = ITEM_PROPERTY_MAP[type];
        if (!prop) return res.status(400).json({ error: "Type d'objet invalide" });
        userData[prop] = (userData[prop] || 0) + (quantity || 1);
        itemAdded = prop;
    }

    saveAllUsersData(users);
    res.json({ success: true, userData: userData, message: "Achat effectué" });
});

// 2. CHARACTER UPGRADE SYSTEM
app.post('/api/character/upgrade', verifyToken, async (req, res) => {
    const { userId, characterName, action, stats, recaptchaToken } = req.body; // action: 'levelup' or 'stats'
    
    // reCAPTCHA Check (only for critical actions, but here all upgrades are critical)
    const botCheck = await verifyRecaptcha(recaptchaToken, userId);
    if (!botCheck.success) return res.status(403).json({ error: botCheck.error });

    const users = loadAllUsersData();
    const userData = users[userId];
    if (!userData) return res.status(404).json({ error: "Utilisateur introuvable" });

    if (action === 'levelup') {
        const level = userData[characterName + '_Level'] || 1;
        if (level >= 11) return res.status(400).json({ error: "Niveau max atteint" });

        const xpNeeded = level * level * 20;
        const cost = level * 25;
        const xp = userData[characterName + '_XP'] || 0;
        const coins = userData.argent || 0;

        if (xp < xpNeeded || coins < cost) return res.status(400).json({ error: "Ressources insuffisantes" });

        userData[characterName + '_Level'] = level + 1;
        userData[characterName + '_XP'] -= xpNeeded;
        userData[characterName + '_pts'] = (userData[characterName + '_pts'] || 0) + 4;
        userData.argent -= cost;

    } else if (action === 'stats') {
        // stats = { PV: 2, attaque: 1, defense: 0 }
        const pointsAvailable = userData[characterName + '_pts'] || 0;
        const totalRequested = (stats.PV || 0) + (stats.attaque || 0) + (stats.defense || 0);
        
        if (totalRequested > pointsAvailable || totalRequested <= 0) return res.status(400).json({ error: "Points invalides" });

        userData[characterName + '_PV_pts'] = (userData[characterName + '_PV_pts'] || 0) + (stats.PV || 0);
        userData[characterName + '_attaque_pts'] = (userData[characterName + '_attaque_pts'] || 0) + (stats.attaque || 0);
        userData[characterName + '_defense_pts'] = (userData[characterName + '_defense_pts'] || 0) + (stats.defense || 0);
        userData[characterName + '_pts'] -= totalRequested;
    } else {
        return res.status(400).json({ error: "Action inconnue" });
    }

    saveAllUsersData(users);
    res.json({ success: true, userData: userData });
});

// 3. PASS SYSTEM
app.post('/api/pass/buy', verifyToken, async (req, res) => {
    const { userId, recaptchaToken } = req.body;
    
    // reCAPTCHA Check
    const botCheck = await verifyRecaptcha(recaptchaToken, userId);
    if (!botCheck.success) return res.status(403).json({ error: botCheck.error });

    const users = loadAllUsersData();
    const userData = users[userId];
    if (!userData) return res.status(404).json({ error: "Utilisateur introuvable" });

    const PASS_COST = 850;
    if ((userData.argent || 0) < PASS_COST) return res.status(400).json({ error: "Solde insuffisant" });
    if (userData.pass_premium) return res.status(400).json({ error: "Pass déjà possédé" });

    userData.argent -= PASS_COST;
    userData.pass_premium = true;
    updateParallelPass(userData, 500); // This adds XP and handles multiple level ups

    saveAllUsersData(users);
    res.json({ success: true, userData: userData });
});


// 4. CLAIM SYSTEMS
app.post('/api/pass/claim', verifyToken, async (req, res) => {
    const { userId, badge, isPremium, recaptchaToken } = req.body;
    const botCheck = await verifyRecaptcha(recaptchaToken, userId);
    if (!botCheck.success) return res.status(403).json({ error: botCheck.error });

    const users = loadAllUsersData();
    const userData = users[userId];
    if (!userData) return res.status(404).json({ error: "Utilisateur introuvable" });

    const key = isPremium ? `premium_${badge}` : `free_${badge}`;
    if (userData[key]) return res.status(400).json({ error: "Déjà récupéré" });

    const rewardsList = isPremium ? PASS_REWARDS.premium : PASS_REWARDS.free;
    const reward = rewardsList.find(r => r.badge === parseInt(badge));
    if (!reward) return res.status(400).json({ error: "Récompense invalide" });

    if (userData.pass_level < reward.badge) return res.status(400).json({ error: "Niveau insuffisant" });
    if (isPremium && !userData.pass_premium) return res.status(403).json({ error: "Pass Premium requis" });

    // Appliquer la récompense
    let resultExtra = {};
    switch (reward.type) {
        case 'coins': userData.argent = (userData.argent || 0) + reward.value; break;
        case 'item': userData[reward.id] = (userData[reward.id] || 0) + reward.value; break;
        case 'lootbox': 
            resultExtra.openBox = reward.boxType; 
            break;
        case 'character': 
            userData[reward.name] = 1; 
            userData.recompense = (userData.recompense || 0) + (reward.bonusRewards || 0);
            break;
        case 'random_reward':
            userData.recompense = (userData.recompense || 0) + (reward.value || 1);
            break;
    }

    userData[key] = true;
    saveAllUsersData(users);
    res.json({ success: true, userData: userData, extra: resultExtra });
});

// --- HELPER: TIMEZONE MANAGEMENT ---
function getParisCycleId(type) {
    const now = new Date();
    // Get Paris time string to parse manually, ensuring we operate in Paris 'wall clock'
    const options = { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(now);
    
    const get = (t) => parseInt(parts.find(p => p.type === t).value, 10);
    
    // Construct a "Floating" date object (UTC) that matches Paris wall time
    const parisWallTime = new Date(Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')));
    
    // Shift by 9 hours to align start of day with 9AM
    parisWallTime.setUTCHours(parisWallTime.getUTCHours() - 9);
    
    if (type === 'daily') {
        return parisWallTime.toISOString().split('T')[0]; // "YYYY-MM-DD"
    } else if (type === 'weekly') {
        // Find most recent Thursday (relative to the shifted time)
        const day = parisWallTime.getUTCDay(); // 0-6 (0=Sunday)
        // Target: 4 (Thursday).
        // Diff = (Current - Target + 7) % 7
        const diff = (day - 4 + 7) % 7;
        parisWallTime.setUTCDate(parisWallTime.getUTCDate() - diff);
        return parisWallTime.toISOString().split('T')[0]; // "YYYY-MM-DD" of the Thursday
    }
}

app.post('/api/shop/claim-daily', verifyToken, async (req, res) => {
    const { userId, recaptchaToken } = req.body;
    const botCheck = await verifyRecaptcha(recaptchaToken, userId);
    if (!botCheck.success) return res.status(403).json({ error: botCheck.error });

    const users = loadAllUsersData();
    const userData = users[userId];
    if (!userData) return res.status(404).json({ error: "Utilisateur introuvable" });

    const cycleId = getParisCycleId('daily');
    if (userData.daily_reward_claim_id === cycleId) {
        return res.status(400).json({ error: "Déjà récupéré aujourd'hui (Reviens à 9h00 Paris)" });
    }

    // Migration/Cleanup for old boolean (optional but clean)
    delete userData.boutique_recompense; 

    userData.recompense = (userData.recompense || 0) + 1;
    userData.daily_reward_claim_id = cycleId;
    userData.boutique_recompense = true; // Kept for client compatibility if it checks this boolean for UI state

    saveAllUsersData(users);
    res.json({ success: true, userData: userData });
});

app.post('/api/shop/claim-weekly', verifyToken, async (req, res) => {
    const { userId, recaptchaToken } = req.body;
    const botCheck = await verifyRecaptcha(recaptchaToken, userId);
    if (!botCheck.success) return res.status(403).json({ error: botCheck.error });

    const users = loadAllUsersData();
    const userData = users[userId];
    if (!userData) return res.status(404).json({ error: "Utilisateur introuvable" });

    const cycleId = getParisCycleId('weekly');
    if (userData.weekly_chest_claim_id === cycleId) {
        return res.status(400).json({ error: "Déjà récupéré cette semaine (Reviens Jeudi à 9h00 Paris)" });
    }

    const types = ['Attaque', 'Défense', 'Agilité', 'Équilibre'];
    const boxType = types[Math.floor(Math.random() * types.length)];
    
    userData.weekly_chest_claim_id = cycleId;
    userData.weekly_lootbox_claimed = new Date().toISOString(); // Keep for legacy client checks if any

    saveAllUsersData(users);
    res.json({ success: true, userData, boxType: boxType });
});

app.post('/api/quest/claim', verifyToken, async (req, res) => {
    const { userId, questKey, recaptchaToken } = req.body;
    const botCheck = await verifyRecaptcha(recaptchaToken, userId);
    if (!botCheck.success) return res.status(403).json({ error: botCheck.error });

    const users = loadAllUsersData();
    const userData = users[userId];
    if (!userData) return res.status(404).json({ error: "Utilisateur introuvable" });

    const current = parseInt(userData[`${questKey}_current`] || 0);
    const total = parseInt(userData[`${questKey}_total`] || 0);
    const claimed = userData[`${questKey}_rewardClaimed`];

    console.log(`[QUEST CLAIM] User: ${userId}, Quest: ${questKey}, Progress: ${current}/${total}, Claimed: ${claimed}`);

    if (claimed) {
        return res.status(400).json({ error: "Déjà récupéré" });
    }
    
    if (current < total || total <= 0) {
        return res.status(400).json({ error: `Quête non terminée (${current}/${total})` });
    }

    // Identify Quest Type & Rewards
    let xpGain = 0;
    let coinGain = 0;
    let recompenseGain = 0;

    if (questKey.startsWith('quete')) { // Daily
        coinGain = 15;
    } else if (questKey.startsWith('weekend-quete')) { // Weekend
        coinGain = 20;
    } else if (questKey.startsWith('Semaine')) { // Weekly
        xpGain = userData[`${questKey}_reward_xp`] || 0;
        recompenseGain = userData[`${questKey}_reward_recompense`] || 0;
    }

    // Apply Rewards
    let rewardsList = [];
    if (coinGain > 0) {
        userData.argent = (userData.argent || 0) + coinGain;
        rewardsList.push({ name: `${coinGain} Points`, info: "Récompense de quête", amount: coinGain });
    }
    if (recompenseGain > 0) {
        userData.recompense = (userData.recompense || 0) + recompenseGain;
        rewardsList.push({ name: `${recompenseGain} Récompense(s) Aléatoire(s)`, info: "Nouveau tirage disponible !" });
    }
    if (xpGain > 0) {
        updateParallelPass(userData, xpGain);
        rewardsList.push({ name: `${xpGain} XP Pass`, info: "Progression du Battle Pass" });
    }

    userData[`${questKey}_completed`] = true;
    userData[`${questKey}_rewardClaimed`] = true;

    saveAllUsersData(users);
    res.json({ success: true, userData: userData, rewards: rewardsList });
});

app.post('/api/quest/claim-weekend-bonus', verifyToken, async (req, res) => {
    const { userId, recaptchaToken } = req.body;
    const botCheck = await verifyRecaptcha(recaptchaToken, userId);
    if (!botCheck.success) return res.status(403).json({ error: botCheck.error });

    const users = loadAllUsersData();
    const userData = users[userId];
    if (!userData) return res.status(404).json({ error: "Utilisateur introuvable" });

    if (userData.weekend_bonus_claimed) return res.status(400).json({ error: "Déjà récupéré" });

    userData.argent = (userData.argent || 0) + 40;
    userData.weekend_bonus_claimed = true;

    saveAllUsersData(users);
    res.json({ 
        success: true, 
        userData: userData, 
        rewards: [{ name: "40 Points", info: "Bonus : Toutes les quêtes du weekend finies !", amount: 40 }] 
    });
});

// 5. RESTRICTED SYNC ENDPOINT
// This replaces the old unrestricted 'users[id] = req.body'
app.post('/api/user/:userId', verifyToken, (req, res) => {
    const users = loadAllUsersData();
    const userId = req.params.userId;
    const newData = req.body.userData;

    // --- PSEUDO UNICITY CHECK ---
    if (newData.pseudo) {
        const normalizedNewPseudo = newData.pseudo.trim().toLowerCase();
        const currentUser = users[userId] || {};
        
        // On ne vérifie l'unicité QUE si le pseudo a changé
        if (!currentUser.pseudo || currentUser.pseudo.trim().toLowerCase() !== normalizedNewPseudo) {
            const existingUserWithPseudo = Object.keys(users).find(uid => 
                uid !== userId && 
                users[uid].pseudo && 
                users[uid].pseudo.trim().toLowerCase() === normalizedNewPseudo
            );

            if (existingUserWithPseudo) {
                console.warn(`[USER] Pseudo "${newData.pseudo}" déjà pris par UID: ${existingUserWithPseudo}`);
                return res.status(400).json({ 
                    success: false, 
                    error: "Ce pseudo est déjà utilisé par un autre joueur." 
                });
            }
        }
    }
    
    // --- QUEST RESET LOGIC (PARIS TIME) ---
    // We check if the cycle has changed compared to what's stored in userData.
    // If we create a new user, we init the cycles.
    
    const dailyCycle = getParisCycleId('daily');
    const weeklyCycle = getParisCycleId('weekly');
    const now = Date.now();

    if (!users[userId]) {
        // First time user creation, or lost user? 
        users[userId] = newData; 
        users[userId].quest_daily_cycle = dailyCycle;
        users[userId].quest_weekly_cycle = weeklyCycle;
        users[userId].createdAt = now;
        users[userId].lastSeen = now;
    } else {
        const current = users[userId];
        current.lastSeen = now;
        if (!current.createdAt) current.createdAt = now; // Retro-fill for existing users
        
        // --- DAILY QUEST RESET ---
        if (current.quest_daily_cycle !== dailyCycle) {
            if (current.quest_daily_cycle !== undefined) {
                console.log(`[QUESTS] Resetting daily quests for ${userId}`);
            }
            current.quest_daily_cycle = dailyCycle;
            current.quetes_jour = false; // Forces client to regenerate
            // Clear daily quest data
            ['quete1', 'quete2', 'quete3'].forEach(id => {
                delete current[`${id}_text`];
                delete current[`${id}_total`];
                delete current[`${id}_current`];
                delete current[`${id}_type`];
                delete current[`${id}_completed`];
                delete current[`${id}_rewardClaimed`];
            });
        }

        // --- WEEKLY QUEST RESET ---
        // Weekly quests are pre-generated (Semaine1...Semaine9) but their *availability* depends on the date.
        // However, if we wanted to *regenerate* them or handle specific weekly mechanics, we'd do it here.
        // Current client logic: App.updateWeeksStatus() unlocks weeks based on fixed dates.
        // So we just need to ensure consistency if needed. 
        // For now, we trust the fixed dates in client/server for unlocking, but we could enforce it here.
        
        // Example: If a new week starts, we might want to notify or ensure 'semaineX' is true.
        // But since 'semaineX' boolean is derived from date on client, we can leave it be or mirror it.
        // Let's rely on the client's date check for *unlocking*, but we can use this hook for *cleanup* if needed.
        
        // --- WEEKEND QUEST RESET ---
        // Weekend cycle isn't just a simple ID, it's a window (Fri 9am - Mon 9am).
        // Logic handled largely on client (App.assignWeekendQuests), but we can enforce cleanup.
        // (Client already does cleanup if outside window).
        
        // WHITELIST: Only allow specific fields to be updated from client
        // Everything else (money, stats, inventory) must be changed via authoritative endpoints.
        const ALLOWED_FIELDS = [
            'pseudo', 
            'settings',
            'tutorial_menu_principal_completed',
            'lastLoginDay',
            'lastDoubleXPCheck',
            'musicAllowed',
            'autoplayEnabled',
            'pass_last_notified_level',
            'characterToImprove',
            'tropheesMax',
            'victoires',
            'defaites',
            'manches_max',
            'classicGames',
            'survivalGames',
            // Quêtes et Cycles
            'quest_daily_cycle',
            'quest_weekly_cycle',
            'daily_reward_claim_id',
            'weekly_chest_claim_id',
            'weekend_bonus_claimed',
            'quetes_jour', 
            'quetes_weekend',
            'weekend_period_start', 
            'quetes_genere',
            'equipments'
        ];

        // Also allow specific quest fields (text, total, type...) because currently GENERATION is client-side.
        // We allow the client to write these *once* after generation (flag 'quetes_jour' becomes true).
        // Since we reset 'quetes_jour' to false on cycle change above, the client will regenerate and send new data.
        // We must allow this new data to be saved.
        const QUEST_FIELDS_PREFIXES = ['quete', 'weekend-quete', 'Semaine'];
        
        Object.keys(newData).forEach(key => {
            if (ALLOWED_FIELDS.includes(key)) {
                current[key] = newData[key];
            } else if (QUEST_FIELDS_PREFIXES.some(prefix => key.startsWith(prefix))) {
                // LOGIQUE DE FUSION INTELLIGENTE :
                // Le client ne peut pas écraser une progression supérieure ou une quête finie sur le serveur
                if (key.endsWith('_current')) {
                    const clientVal = parseInt(newData[key] || 0);
                    const serverVal = parseInt(current[key] || 0);
                    current[key] = Math.max(clientVal, serverVal); // On garde le plus grand des deux
                } else if (key.endsWith('_completed') || key.endsWith('_rewardClaimed')) {
                    // Si c'est déjà vrai sur le serveur, on ne laisse pas le client remettre à faux
                    if (current[key] === true) {
                        // On garde true
                    } else {
                        current[key] = newData[key];
                    }
                } else {
                    current[key] = newData[key];
                }
            }
        });
        
        // AUTO-FIX: If XP is already overflowing, trigger level up logic
        updateParallelPass(current, 0); 
    }

    saveAllUsersData(users);
    // Renvoyer les données à jour pour que le client mette à jour son localStorage
    res.json({ success: true, userData: users[userId] });
});

app.get('/api/user/:userId', verifyToken, (req, res) => { const users = loadAllUsersData(); res.json({ success: true, userData: users[req.params.userId] || null }); });
app.get('/api/news', (req, res) => { res.json(fs.existsSync(NEWS_FILE) ? JSON.parse(fs.readFileSync(NEWS_FILE, 'utf8')) : {}); });
app.get('/api/config/maintenance', (req, res) => { 
    const config = loadServerConfig();
    const now = Date.now();
    
    // Si la maintenance manuelle est OFF, on vérifie le planning
    if (!config.maintenance && config.scheduled_start && config.scheduled_end) {
        const start = new Date(config.scheduled_start).getTime();
        const end = new Date(config.scheduled_end).getTime();
        
        if (now >= start && now <= end) {
            config.maintenance = true;
            config.maintenance_message = config.maintenance_message || "Maintenance programmée en cours.";
        }
    }
    
    res.json(config); 
});

// --- ADMIN API ---

app.post('/api/admin/maintenance', verifyToken, verifyAdmin, (req, res) => {
    const { maintenance, message, scheduled_start, scheduled_end } = req.body;
    const config = loadServerConfig();
    
    config.maintenance = maintenance;
    if (message) config.maintenance_message = message;
    
    // Nouvelles options de programmation
    config.scheduled_start = scheduled_start || null;
    config.scheduled_end = scheduled_end || null;
    
    saveServerConfig(config);
    console.log(`[ADMIN] Maintenance updated by ${req.uid}`);
    res.json({ success: true, config });
});

app.post('/api/admin/news', verifyToken, verifyAdmin, (req, res) => {
    const { news } = req.body;
    try {
        fs.writeFileSync(NEWS_FILE, JSON.stringify(news, null, 2), 'utf8');
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Erreur sauvegarde news" });
    }
});

app.get('/api/admin/users', verifyToken, verifyAdmin, (req, res) => {
    const { search, sortBy } = req.query;
    const users = loadAllUsersData();
    let results = [];
    
    Object.keys(users).forEach(uid => {
        const u = users[uid];
        if (!search || (u.pseudo && u.pseudo.toLowerCase().includes(search.toLowerCase())) || uid === search) {
            results.push({
                uid: uid,
                pseudo: u.pseudo || 'Sans Nom',
                argent: u.argent,
                trophees: u.trophees,
                isAdmin: !!u.isAdmin,
                lastSeen: u.lastSeen || 0,
                createdAt: u.createdAt || 0
            });
        }
    });

    // Tri
    if (sortBy === 'newest') results.sort((a, b) => b.createdAt - a.createdAt);
    else if (sortBy === 'oldest') results.sort((a, b) => a.createdAt - b.createdAt);
    else if (sortBy === 'active') results.sort((a, b) => b.lastSeen - a.lastSeen);
    else if (sortBy === 'trophees') results.sort((a, b) => b.trophees - a.trophees);
    else if (sortBy === 'argent') results.sort((a, b) => b.argent - a.argent);
    
    res.json({ success: true, users: results.slice(0, 100) }); // Augmenté à 100
});

app.get('/api/admin/user/:uid', verifyToken, verifyAdmin, (req, res) => {
    const users = loadAllUsersData();
    const u = users[req.params.uid];
    if (u) res.json({ success: true, user: u });
    else res.status(404).json({ error: "User not found" });
});

app.post('/api/admin/user/:uid', verifyToken, verifyAdmin, (req, res) => {
    const users = loadAllUsersData();
    const uid = req.params.uid;
    if (!users[uid]) return res.status(404).json({ error: "User not found" });
    
    // Update fields
    const updates = req.body.updates;
    if (updates) {
        // Danger zone: Admin can overwrite anything.
        Object.assign(users[uid], updates);
        saveAllUsersData(users);
    }
    res.json({ success: true, user: users[uid] });
});
app.post('/api/lootbox/open', verifyToken, async (req, res) => {
    const { userId, boxType, recaptchaToken } = req.body;
    const botCheck = await verifyRecaptcha(recaptchaToken, userId);
    if (!botCheck.success) return res.status(403).json({ error: botCheck.error });

    const users = loadAllUsersData();
    const userData = users[userId];
    if (!userData) return res.status(404).json({ error: "User not found" });

    // Probabilités et Raretés
    const rand = Math.random();
    let rarity = 'commun';
    if (rand < 0.05) rarity = 'légendaire';
    else if (rand < 0.30) rarity = 'rare';

    const allEquipments = loadJSONData(EQUIPMENTS_FILE, []);
    let possible = allEquipments.filter(e => 
        e.type.toLowerCase() === boxType.toLowerCase() && 
        e.rarity.toLowerCase() === rarity.toLowerCase()
    );

    // Fallback si aucun item ne match exactement le type + rareté
    if (possible.length === 0) {
        possible = allEquipments.filter(e => e.type.toLowerCase() === boxType.toLowerCase());
    }
    if (possible.length === 0) {
        possible = allEquipments; // Ultime recours
    }

    const selected = possible[Math.floor(Math.random() * possible.length)];
    const rewardId = selected ? selected.id : "gantelets_force";
    
    if (!userData.equipments) userData.equipments = [];
    userData.equipments.push(rewardId);
    saveAllUsersData(users);

    res.json({ success: true, userData, reward: { id: rewardId, rarity: selected ? selected.rarity : rarity, type: boxType } });
});

const games = new Map();
app.post('/api/combat/start', verifyToken, async (req, res) => {
    const { userId, gameMode, playerCharacter, opponentCharacter, recaptchaToken } = req.body;

    // reCAPTCHA Check
    const botCheck = await verifyRecaptcha(recaptchaToken, userId);
    if (!botCheck.success) return res.status(403).json({ error: botCheck.error });

    const users = loadAllUsersData();
    if (!users[userId]) return res.status(404).json({ error: "User not found" });
    
    // Initialize AI State
    const aiState = {
        lastState: null,
        lastAction: null,
        lastHPDiff: 0
    };

    const gameState = { 
        userId, 
        gameMode, 
        player: playerCharacter, 
        opponent: opponentCharacter, 
        wave: gameMode === 'survie' ? 1 : 0, 
        turn: 1, 
        logs: [], 
        playerActions: [], 
        aiState: aiState,
        // --- ANTI-BOT TIMESTAMPS ---
        startTime: Date.now(),
        lastActionTime: Date.now() 
    };

    if (gameMode === 'survie') gameState.opponent = generateSurvivalOpponent(1);
    
    // --- WEEKEND EVENT LOGIC ---
    if (gameMode === 'weekend') {
        const event = WEEKEND_EVENTS[Math.floor(Math.random() * WEEKEND_EVENTS.length)];
        gameState.event = event;
        combatEngine.applyWeekendEvent(gameState, event);
    }

    // Make initial decision
    gameState.opponent.next_choice = combatEngine.makeAIDecision(gameState);
    
    games.set(userId, gameState);
    res.json({ success: true, gameState });
});

app.post('/api/combat/action', verifyToken, (req, res) => {
    const { userId, action } = req.body;
    const game = games.get(userId);
    if (!game) return res.status(404).json({ error: "Partie non trouvée" });
    
    // --- ANTI-BOT: VELOCITY CHECK ---
    const now = Date.now();
    const MIN_ACTION_DELAY = 500; // 500ms minimum between actions (human reaction time + animation)
    
    if (action !== 'opponent_init' && (now - game.lastActionTime < MIN_ACTION_DELAY)) {
        console.warn(`[ANTI-BOT] User ${userId} acting too fast (${now - game.lastActionTime}ms). Action ignored.`);
        return res.status(429).json({ error: "Ralentissez ! Vous jouez trop vite." });
    }
    game.lastActionTime = now;

    const results = { gameOver: false, waveCleared: false, winner: null, logs: [] };
    const { player, opponent } = game;

    if (action === 'cheat_win') { player.degats_partie = (player.degats_partie || 0) + opponent.pv; opponent.pv = 0; results.logs.push({ text: "TRICHE : Victoire !", color: 'gold', side: 'milieu' }); }
    else if (action === 'cheat_fail') { player.pv = 0; if (game.gameMode === 'survie') game.wave = 5; results.logs.push({ text: "TRICHE : Défaite !", color: 'red', side: 'milieu' }); }
    else if (action === 'use_item') {
        const { itemName } = req.body;
        combatEngine.applyItem(game, itemName, results);
    }
    else {
        // --- TURN START ---
        if (action !== 'opponent_init') {
            // AI Intent for THIS turn (Anticipation)
            // Unconditional Anticipation:
            // - If Player is faster: AI hasn't played yet, needs shield to survive player's attack.
            // - If AI is faster (Tour 2+): Code executes Player first, so we simulate AI playing 'before' by pre-activating shield.
            const aiIntent = opponent.next_choice || 'attack';

            if (aiIntent === 'defend' && (opponent.defense_droit || 0) === 0 && (opponent.spe || 0) >= 0.1) {
                opponent.defense_bouton = 1;
            }

            // Player Action
            game.playerActions.push(action);
            combatEngine.updateTour(player, opponent, true, results);
            if (action === 'attack') combatEngine.handleAttack(player, opponent, true, results);
            else if (action === 'special') combatEngine.applySpecialAbility(player, opponent, true, results);
            else if (action === 'defend') { 
                player.defense_bouton = 1; player.spe = Math.max(0, player.spe - 0.1); player.defense_droit = 4; player.defense_partie = (player.defense_partie || 0) + 1;
                results.logs.push({ text: `${player.name} se défend.`, color: 'white', side: true }); 
            }
            combatEngine.passerTour(player, results);
        }

        if (opponent.pv <= 0) {
            if (game.gameMode === 'survie') { results.waveCleared = true; }
            else { 
                results.gameOver = true; 
                results.winner = 'player'; 

                // --- ANTI-BOT: IMPOSSIBLE WIN TIME CHECK ---
                const gameDuration = Date.now() - game.startTime;
                const MIN_GAME_DURATION = 8000; // 8 seconds minimum to win a fair fight
                
                if (gameDuration < MIN_GAME_DURATION && action !== 'cheat_win') { // Allow cheat_win for dev testing if kept
                     console.warn(`[ANTI-BOT] User ${userId} won in ${gameDuration}ms. Suspicious.`);
                     // Disqualify
                     results.winner = 'opponent'; 
                     results.logs.push({ text: "Victoire annulée : Anomalie temporelle détectée.", color: 'red', side: 'milieu' });
                     // We finalize as a loss or just return nothing
                }

                finalizeGame(userId, game, results); 
                return res.json({ success: true, game, results }); 
            }
        } else {
            // AI Action Logic with Double-Turn Prevention
            
            // Check if we should skip AI this turn (because it already played in opponent_init)
            if (game.skipNextAI) {
                game.skipNextAI = false;
                // We still need to calculate next_choice for the NEXT turn's anticipation
                // But since AI didn't act, its state hasn't changed, so next_choice remains valid?
                // Actually, if we skip AI execution, we shouldn't change anything.
                // But we might want to ensure 'defense_bouton' is cleared if it wasn't used? 
                // No, anticipation handled it.
            } else {
                // Execute AI Turn
                if (action === 'opponent_init') {
                    // This is the separate AI init turn. Mark to skip the next immediate AI execution logic (in the player's attack request).
                    game.skipNextAI = true;
                }

                combatEngine.updateTour(player, opponent, false, results);
                combatEngine.passerTour(opponent, results);
                
                const aiAct = opponent.next_choice || 'attack';
                
                // Reset defense button state from previous turn/anticipation unless renewing defense
                if (aiAct === 'defend') {
                    if (action === 'opponent_init') {
                         opponent.defense_bouton = 1;
                    }
                    // If it was already set by anticipation (opponent.defense_bouton === 1), we keep it?
                    // No, anticipation was for the PLAYER's turn. 
                    // Now it's the AI's turn "result".
                    // The shield stays active for the cycle.
                    opponent.defense_droit = 3;
                    opponent.spe = Math.max(0, (opponent.spe || 0) - 0.1);
                    results.logs.push({ text: `${opponent.name} s'est défendu !`, color: 'white', side: false });
                } else {
                    opponent.defense_bouton = 0; // Ensure shield is gone if not defending
                    if (opponent.immobilisation > 0) results.logs.push({ text: `${opponent.name} est immobilisé !`, color: 'white', side: false });
                    else if (aiAct === 'attack') combatEngine.handleAttack(opponent, player, false, results);
                    else if (aiAct === 'special') combatEngine.applySpecialAbility(opponent, player, false, results);
                }

                if (player.pv <= 0) { results.gameOver = true; results.winner = 'opponent'; finalizeGame(userId, game, results); }
                else { 
                    // Pre-calculate for NEXT turn
                    opponent.next_choice = combatEngine.makeAIDecision(game); 
                }
            }
        }
    }
    res.json({ success: true, game, results });
});

app.post('/api/combat/survival/upgrade', verifyToken, (req, res) => {
    const { userId, stat } = req.body;
    const game = games.get(userId);
    if (!game) return res.status(404).json({ error: "Partie non trouvée" });
    const player = game.player;
    if (stat === 'pv') { player.pv_max = Math.round(player.pv_max * 1.09); player.pv = player.pv_max; }
    else if (stat === 'attaque') player.attaque_originale = Math.round(player.attaque_originale * 1.13);
    else if (stat === 'defense') player.defense_originale = Math.round(player.defense_originale * 1.2);
    game.wave++; game.opponent = generateSurvivalOpponent(game.wave);
    res.json({ success: true, game });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Serveur démarré sur http://localhost:${PORT}`);
    
    // Détection de l'IP locale pour le QR Code
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    let localIp = 'localhost';
    
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                localIp = net.address;
            }
        }
    }

    const url = `http://${localIp}:${PORT}`;
    console.log(`📱 Accès mobile : ${url}`);
    console.log(`\nScan ce QR Code avec ton iPhone pour ouvrir le jeu :`);
    qrcode.generate(url, { small: true });
    console.log(`\nNote: Pour les Passkeys, utilise de préférence HTTPS (ngrok/localtunnel).\n`);
});
