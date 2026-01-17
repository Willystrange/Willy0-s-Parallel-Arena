// scripts/admin.js
window.App = window.App || {};

App.adminUser = null;

// --- INITIALISATION ---
function getUserData() {
    return JSON.parse(localStorage.getItem('userData')) || {};
}

if (!firebase.apps.length) {
    if (window.firebaseConfig) {
        firebase.initializeApp(window.firebaseConfig);
    } else {
        console.error("Configuration Firebase manquante !");
        alert("Erreur critique : Configuration Firebase non trouvée.");
    }
}

firebase.auth().onAuthStateChanged(async user => {
    if (user) {
        console.log("Connecté en tant que :", user.uid);
        const token = await user.getIdToken();
        // Vérifier si l'utilisateur est admin auprès du serveur
        try {
            const res = await fetch(`/api/user/${user.uid}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.userData && data.userData.isAdmin) {
                App.adminUser = user;
                document.getElementById('login-screen').classList.add('hidden');
                App.loadMaintenanceStatus();
                App.loadVersion();
                App.loadNews();
                
                // Monitorer les gens en ligne
                App.fetchOnlineStatus();
                setInterval(App.fetchOnlineStatus, 15000); 
            } else {
                console.error("UID non admin :", user.uid);
                alert("Accès refusé. Votre UID est : " + user.uid + ". Ajoutez-le comme isAdmin:true dans users_data.json");
                firebase.auth().signOut();
            }
        } catch (e) {
            console.error(e);
            alert("Erreur de vérification des droits.");
        }
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
    }
});

App.login = function(event) {
    console.log("Tentative de connexion...");
    const btn = event ? event.target : null;
    if (btn) btn.innerText = "Connexion en cours...";
    const provider = new firebase.auth.GoogleAuthProvider();
    // Utilisation de redirect au lieu de popup pour mobile
    firebase.auth().signInWithRedirect(provider);
};

// Gérer le retour de redirection
firebase.auth().getRedirectResult().catch(error => {
    if (error.code !== 'auth/no-auth-event') {
        alert("Erreur retour connexion : " + error.message);
    }
});

App.logout = function() {
    firebase.auth().signOut().then(() => {
        window.location.reload();
    });
};

// --- ONLINE STATUS ---
App.fetchOnlineStatus = async function() {
    if (!App.adminUser) return;
    try {
        const token = await App.adminUser.getIdToken();
        const res = await fetch('/api/admin/online', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.success) {
            document.getElementById('online-count').innerText = `En ligne : ${data.count}`;
            App.renderActiveUsers(data.users);
        }
    } catch (e) {
        console.error("Erreur check online:", e);
    }
};

App.renderActiveUsers = function(users) {
    const container = document.getElementById('active-users-list');
    if (!container) return;
    
    if (users.length === 0) {
        container.innerHTML = "<p style='text-align:center; color:#555;'>Personne en ligne.</p>";
        return;
    }

    container.innerHTML = "";
    users.forEach(u => {
        const div = document.createElement('div');
        div.className = "user-list-item";
        div.innerHTML = `
            <div>
                <span style="color:#03dac6;">●</span> ${u.pseudo}
                <small>${u.uid}</small>
            </div>
            <button onclick="App.quickEditActive('${u.uid}')">Gérer</button>
        `;
        container.appendChild(div);
    });
};

App.quickEditActive = function(uid) {
    // Basculer sur l'onglet Joueurs et charger l'utilisateur
    App.switchTab('users');
    App.editUser(uid);
};

// --- NAVIGATION ---
App.switchTab = function(tabId) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.content').forEach(el => el.classList.remove('active'));
    
    const activeTab = Array.from(document.querySelectorAll('.nav-item')).find(el => {
        const onclick = el.getAttribute('onclick');
        return onclick && onclick.includes(`'${tabId}'`);
    });
    if (activeTab) activeTab.classList.add('active');
    
    const content = document.getElementById(`tab-${tabId}`);
    if (content) content.classList.add('active');

    // Auto-load logic
    if (tabId === 'users') {
        App.searchUsers();
    } else if (tabId === 'active') {
        App.fetchOnlineStatus();
    } else if (tabId === 'news') {
        App.loadNews();
    }
};

// ...

// --- USERS ---
App.searchUsers = async function() {
    const query = document.getElementById('user-search').value;
    const sortBy = document.getElementById('user-sort').value;
    const container = document.getElementById('user-results');
    
    container.innerHTML = "<p style='text-align:center; color:#888;'>Chargement...</p>";
    
    try {
        const token = await App.adminUser.getIdToken();
        const res = await fetch(`/api/admin/users?search=${encodeURIComponent(query)}&sortBy=${sortBy}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        container.innerHTML = "";
        
        if (!data.users || data.users.length === 0) {
            container.innerHTML = "<p style='text-align:center; color:#888;'>Aucun joueur trouvé.</p>";
            return;
        }
        
        data.users.forEach(u => {
            const div = document.createElement('div');
            div.className = "user-list-item";
            
            const lastSeenStr = u.lastSeen ? new Date(u.lastSeen).toLocaleString('fr-FR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}) : 'Inconnue';
            
            div.innerHTML = `
                <div>
                    <span style="font-weight:bold;">${u.pseudo || 'Sans Pseudo'}</span>
                    <small>ID: ${u.uid}</small>
                    <small style="color:#03dac6;">Activité: ${lastSeenStr}</small>
                </div>
                <button onclick="App.editUser('${u.uid}')">Éditer</button>
            `;
            container.appendChild(div);
        });
    } catch (e) {
        console.error("Erreur recherche utilisateurs:", e);
        container.innerHTML = "<p style='text-align:center; color:#cf6679;'>Erreur de chargement.</p>";
    }
};

App.editUser = async function(uid) {
    const token = await App.adminUser.getIdToken();
    const res = await fetch(`/api/admin/user/${uid}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    
    if (data.success) {
        const u = data.user;
        // Points de restauration et mémoire de session pour les trophées
        App.baselineTM = u.tropheesMax || 0;
        App.sessionT = u.trophees || 0;
        
        document.getElementById('edit-uid').value = uid;
        document.getElementById('edit-pseudo').value = u.pseudo || "";
        document.getElementById('edit-argent').value = u.argent || 0;
        document.getElementById('edit-trophees').value = u.trophees || 0;
        document.getElementById('edit-tropheesMax').value  = u.tropheesMax || 0;
        document.getElementById('edit-admin').value = u.isAdmin ? "true" : "false";
        document.getElementById('edit-raw').value = JSON.stringify(u, null, 2);
        
        document.getElementById('user-editor').classList.remove('hidden');
        document.getElementById('user-editor').scrollIntoView({ behavior: 'smooth' });
    }
};

App.devAction = function(action) {
    try {
        let raw = JSON.parse(document.getElementById('edit-raw').value);
        let count = 0;
        
        switch(action) {
            case 'reset_daily':
                raw.quetes_jour = false;
                raw.quest_daily_cycle = null; // Force le serveur à voir un nouveau jour
                ['quete1', 'quete2', 'quete3'].forEach(id => {
                    delete raw[`${id}_text`]; delete raw[`${id}_total`]; delete raw[`${id}_current`];
                    delete raw[`${id}_type`]; delete raw[`${id}_completed`]; delete raw[`${id}_rewardClaimed`];
                    raw[`${id}_rewardClaimed`] = false; // Double sécurité
                });
                break;
            case 'complete_daily':
                raw.quetes_jour = true;
                ['quete1', 'quete2', 'quete3'].forEach(id => {
                    if (raw[`${id}_total`]) {
                        raw[`${id}_current`] = raw[`${id}_total`];
                        raw[`${id}_completed`] = true;
                        raw[`${id}_rewardClaimed`] = false; // Reset la réclamation pour pouvoir retester
                        count++;
                    }
                });
                if (count === 0) alert("Aucune quête quotidienne trouvée. Générez-les d'abord.");
                break;
            case 'reset_weekly':
                raw.quetes_genere = false;
                raw.quest_weekly_cycle = null; // Force le serveur à voir une nouvelle semaine
                Object.keys(raw).forEach(key => {
                    if (key.startsWith('Semaine')) {
                        delete raw[key];
                        if (key.endsWith('_rewardClaimed')) raw[key] = false;
                    }
                });
                break;
            case 'complete_weekly':
                raw.quetes_genere = true;
                Object.keys(raw).forEach(key => {
                    if (key.startsWith('Semaine') && key.endsWith('_total')) {
                        const base = key.replace('_total', '');
                        raw[`${base}_current`] = raw[key];
                        raw[`${base}_completed`] = true;
                        raw[`${base}_rewardClaimed`] = false; // Reset la réclamation
                        count++;
                    }
                });
                if (count === 0) alert("Aucune quête hebdomadaire trouvée.");
                break;
            case 'reset_shop':
                raw.boutique_recompense = false;
                raw.daily_reward_claim_id = null; // Reset l'ID de session journalière
                raw.weekly_chest_claim_id = null; // Reset l'ID de session hebdo
                raw.weekly_lootbox_claimed = null;
                break;
            case 'reset_weekend':
                raw.quetes_weekend = false;
                raw.weekend_period_start = null;
                raw.weekend_bonus_claimed = false;
                ['weekend-quete1', 'weekend-quete2', 'weekend-quete3'].forEach(id => {
                    delete raw[`${id}_text`]; delete raw[`${id}_total`]; delete raw[`${id}_current`];
                    delete raw[`${id}_type`]; delete raw[`${id}_completed`]; delete raw[`${id}_rewardClaimed`];
                });
                break;
            case 'complete_weekend':
                raw.quetes_weekend = true;
                ['weekend-quete1', 'weekend-quete2', 'weekend-quete3'].forEach(id => {
                    if (raw[`${id}_total`]) {
                        raw[`${id}_current`] = raw[`${id}_total`];
                        raw[`${id}_completed`] = true;
                        raw[`${id}_rewardClaimed`] = false;
                        count++;
                    }
                });
                if (count === 0) alert("Aucune quête de weekend trouvée.");
                break;
            case 'unlock_premium':
                raw.pass_premium = true;
                break;
            case 'max_pass':
                raw.pass_level = 60;
                raw.pass_XP = 0;
                break;
            case 'reset_pass':
                raw.pass_level = 0;
                raw.pass_XP = 0;
                raw.pass_premium = false;
                // Supprimer toutes les récompenses déjà récupérées
                Object.keys(raw).forEach(key => {
                    if (key.startsWith('free_') || key.startsWith('premium_')) {
                        delete raw[key];
                    }
                });
                break;
            case 'unlock_all':
                const ALL_CHARS = ["Willy", "Cocobi", "Oiseau", "Grours", "Baleine", "Doudou", "Coeur", "Diva", "Poulpy", "Colorina", "Rosalie", "Sboonie", "Inconnu", "Boompy", "Perro", "Nautilus", "Paradoxe", "Korb"];
                ALL_CHARS.forEach(c => raw[c] = 1);
                raw.nbr_perso = ALL_CHARS.length;
                break;
        }
        
        // Mettre à jour l'affichage
        document.getElementById('edit-raw').value = JSON.stringify(raw, null, 2);
        App.syncFieldsFromRaw(raw);
        
        if (count > 0 || action.includes('reset') || action === 'unlock_all') {
            alert("Action appliquée ! N'oubliez pas de cliquer sur 'Enregistrer tout' en bas.");
        }
    } catch (e) {
        alert("Erreur : JSON invalide dans le champ brutes.");
    }
};

// Fonction utilitaire pour synchroniser les champs du formulaire après une action dev
App.syncFieldsFromRaw = function(raw) {
    document.getElementById('edit-pseudo').value = raw.pseudo || "";
    document.getElementById('edit-argent').value = raw.argent || 0;
    document.getElementById('edit-trophees').value = raw.trophees || 0;
    document.getElementById('edit-tropheesMax').value = raw.tropheesMax || 0;
    document.getElementById('edit-admin').value = raw.isAdmin ? "true" : "false";
};

App.saveUser = async function() {
    const uid = document.getElementById('edit-uid').value;
    
    let trophees = parseInt(document.getElementById('edit-trophees').value) || 0;
    let tropheesMax = parseInt(document.getElementById('edit-tropheesMax').value) || 0;

    // Appliquer la logique de cohérence avant sauvegarde
    if (trophees > tropheesMax) tropheesMax = trophees;
    if (tropheesMax < trophees) trophees = tropheesMax;

    const updates = {
        pseudo: document.getElementById('edit-pseudo').value,
        argent: parseInt(document.getElementById('edit-argent').value) || 0,
        trophees: trophees,
        tropheesMax: tropheesMax,
        isAdmin: document.getElementById('edit-admin').value === "true"
    };
    
    try {
        const raw = JSON.parse(document.getElementById('edit-raw').value);
        Object.assign(raw, updates); 
        
        const token = await App.adminUser.getIdToken();
        const res = await fetch(`/api/admin/user/${uid}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ updates: raw })
        });
        const data = await res.json();
        if (data.success) {
            alert("Utilisateur mis à jour !");
            App.searchUsers();
        }
    } catch (e) {
        alert("Erreur JSON dans les données brutes.");
    }
};

// --- LOGIQUE LIVE SYNC TROPHÉES ---
App.baselineTM = 0;
App.sessionT = 0;

document.addEventListener('input', function(e) {
    const trophEl = document.getElementById('edit-trophees');
    const maxEl = document.getElementById('edit-tropheesMax');
    if (!trophEl || !maxEl) return;

    if (e.target.id === 'edit-trophees') {
        // L'utilisateur définit une nouvelle intention (sessionT)
        App.sessionT = parseInt(trophEl.value) || 0;
        
        // Le Max suit si l'intention dépasse le max d'origine
        // Sinon il revient au max d'origine
        maxEl.value = Math.max(App.sessionT, App.baselineTM);
    }
    
    if (e.target.id === 'edit-tropheesMax') {
        let currentMax = parseInt(maxEl.value) || 0;
        
        // Les trophées sont bridés par le max actuel,
        // mais remontent vers l'intention initiale si on ré-augmente le Max
        trophEl.value = Math.min(currentMax, App.sessionT);
    }
});

// --- MISSING FUNCTIONS ---

App.loadVersion = async function() {
    try {
        const token = await App.adminUser.getIdToken();
        const res = await fetch('/api/admin/version', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('game-version').value = data.version;
        }
    } catch(e) { console.error("Error loading version:", e); }
};

App.saveVersion = async function() {
    const version = document.getElementById('game-version').value;
    try {
        const token = await App.adminUser.getIdToken();
        const res = await fetch('/api/admin/version', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ version })
        });
        const data = await res.json();
        if (data.success) {
            alert("Version mise à jour !");
            // Reload to see the effect (comparison logic)
            App.loadVersion();
        } else alert("Erreur: " + data.error);
    } catch(e) { alert("Erreur réseau"); }
};

App.loadMaintenanceStatus = async function() {
    try {
        const res = await fetch('/api/config/maintenance');
        const data = await res.json();
        if (document.getElementById('maintenance-toggle')) document.getElementById('maintenance-toggle').checked = data.maintenance;
        if (document.getElementById('maintenance-message')) document.getElementById('maintenance-message').value = data.message || "";
        if (document.getElementById('scheduled-start')) document.getElementById('scheduled-start').value = data.scheduledStart || "";
        if (document.getElementById('scheduled-end')) document.getElementById('scheduled-end').value = data.scheduledEnd || "";
    } catch(e) { console.error(e); }
};

App.saveMaintenance = async function() {
    const config = {
        maintenance: document.getElementById('maintenance-toggle').checked,
        message: document.getElementById('maintenance-message').value,
        scheduledStart: document.getElementById('scheduled-start').value,
        scheduledEnd: document.getElementById('scheduled-end').value
    };
    
    try {
        const token = await App.adminUser.getIdToken();
        await fetch('/api/admin/maintenance', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(config)
        });
        alert("Configuration maintenance sauvegardée !");
    } catch(e) { alert("Erreur sauvegarde"); }
};

App.loadNews = async function() {
    // To be implemented
};
App.handleNewsSubmit = async function() {
    alert("News: Fonctionnalité non implémentée dans ce fix.");
};
App.resetNewsForm = function() {};