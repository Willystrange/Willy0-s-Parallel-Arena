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
    
    // Correction : on cherche l'élément qui appelle switchTab avec le bon ID
    const activeTab = Array.from(document.querySelectorAll('.nav-item')).find(el => {
        const onclick = el.getAttribute('onclick');
        return onclick && onclick.includes(`'${tabId}'`);
    });
    if (activeTab) activeTab.classList.add('active');
    
    const content = document.getElementById(`tab-${tabId}`);
    if (content) content.classList.add('active');
};

// --- MAINTENANCE ---
App.loadMaintenanceStatus = async function() {
    const res = await fetch('/api/config/maintenance');
    const config = await res.json();
    document.getElementById('maintenance-toggle').checked = config.maintenance;
    document.getElementById('maintenance-message').value = config.maintenance_message || "";
    
    if (config.scheduled_start) document.getElementById('scheduled-start').value = config.scheduled_start;
    if (config.scheduled_end) document.getElementById('scheduled-end').value = config.scheduled_end;
};

App.saveMaintenance = async function() {
    const maintenance = document.getElementById('maintenance-toggle').checked;
    const message = document.getElementById('maintenance-message').value;
    const scheduled_start = document.getElementById('scheduled-start').value;
    const scheduled_end = document.getElementById('scheduled-end').value;
    
    const token = await App.adminUser.getIdToken();
    const res = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
            maintenance, 
            message, 
            scheduled_start: scheduled_start || null, 
            scheduled_end: scheduled_end || null 
        })
    });
    const data = await res.json();
    if (data.success) alert("Maintenance mise à jour !");
    else alert("Erreur : " + data.error);
};

// --- NEWS ---
App.newsData = {};

App.loadNews = async function() {
    const res = await fetch('/api/news');
    App.newsData = await res.json();
    App.renderNewsList();
    
    // Pré-remplir la date et l'heure par défaut
    const now = new Date();
    document.getElementById('news-date').value = now.toISOString().split('T')[0];
    document.getElementById('news-time').value = now.toTimeString().substring(0, 5);
};

App.renderNewsList = function() {
    const container = document.getElementById('news-list');
    container.innerHTML = "";
    
    const newsArray = Object.entries(App.newsData).map(([id, details]) => ({ id, ...details }));
    
    // Trier par date décroissante
    newsArray.sort((a, b) => {
        const toDate = x => new Date(x.date.split("/").reverse().join("-") + "T" + (x.time || "00:00"));
        return toDate(b) - toDate(a);
    });

    newsArray.forEach(news => {
        const typeKey = news.id.substring(2, 4);
        const div = document.createElement('div');
        div.className = "user-list-item";
        div.style.flexDirection = "column";
        div.style.alignItems = "flex-start";
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; width:100%;">
                <span style="font-weight:bold; color:#bb86fc;">${news.title}</span>
                <span style="background:#333; padding:2px 6px; border-radius:4px; font-size:0.7rem;">${typeKey}</span>
            </div>
            <p style="font-size:0.8rem; margin:5px 0; color:#aaa;">${news.content.substring(0, 100)}${news.content.length > 100 ? '...' : ''}</p>
            <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                <small>${news.date} ${news.time}</small>
                <div>
                    <button onclick="App.editNews('${news.id}')" style="margin-right:5px;">Modifier</button>
                    <button class="danger" onclick="App.deleteNews('${news.id}')" style="background:#cf6679; color:black; border:none; padding:3px 8px; border-radius:4px;">Supprimer</button>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
};

App.resetNewsForm = function() {
    document.getElementById('news-id').value = "";
    document.getElementById('news-title').value = "";
    document.getElementById('news-content').value = "";
    document.getElementById('btn-save-news').innerText = "Publier News";
    document.getElementById('btn-cancel-news').classList.add('hidden');
    
    const now = new Date();
    document.getElementById('news-date').value = now.toISOString().split('T')[0];
    document.getElementById('news-time').value = now.toTimeString().substring(0, 5);
};

App.editNews = function(id) {
    const news = App.newsData[id];
    if (!news) return;
    
    document.getElementById('news-id').value = id;
    document.getElementById('news-type').value = id.substring(2, 4);
    document.getElementById('news-title').value = news.title;
    document.getElementById('news-content').value = news.content;
    
    // Convertir DD/MM/YYYY vers YYYY-MM-DD
    const parts = news.date.split("/");
    if (parts.length === 3) {
        document.getElementById('news-date').value = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    document.getElementById('news-time').value = news.time;
    
    document.getElementById('btn-save-news').innerText = "Enregistrer Modifications";
    document.getElementById('btn-cancel-news').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

App.deleteNews = async function(id) {
    if (!confirm("Supprimer cette actualité ?")) return;
    delete App.newsData[id];
    await App.syncNewsWithServer();
};

App.saveNews = async function() {
    const id = document.getElementById('news-id').value;
    const type = document.getElementById('news-type').value;
    const title = document.getElementById('news-title').value;
    const content = document.getElementById('news-content').value;
    const dateInput = document.getElementById('news-date').value;
    const time = document.getElementById('news-time').value;
    
    if (!title || !content || !dateInput) {
        alert("Veuillez remplir tous les champs.");
        return;
    }

    // Formater la date en DD/MM/YYYY
    const d = new Date(dateInput);
    const date = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;

    let finalId = id;
    if (!id) {
        // Générer un nouvel ID auto : XX + TYPE + XX
        const r1 = Math.floor(Math.random() * 90 + 10);
        const r2 = Math.floor(Math.random() * 90 + 10);
        finalId = `${r1}${type}${r2}`;
    }

    App.newsData[finalId] = { title, content, date, time };
    
    await App.syncNewsWithServer();
    App.resetNewsForm();
};

App.syncNewsWithServer = async function() {
    const token = await App.adminUser.getIdToken();
    const res = await fetch('/api/admin/news', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ news: App.newsData })
    });
    const data = await res.json();
    if (data.success) {
        alert("Actualités synchronisées !");
        App.renderNewsList();
    } else {
        alert("Erreur de synchronisation.");
    }
};

// --- USERS ---
App.searchUsers = async function() {
    const query = document.getElementById('user-search').value;
    const sortBy = document.getElementById('user-sort').value;
    
    const token = await App.adminUser.getIdToken();
    const res = await fetch(`/api/admin/users?search=${encodeURIComponent(query)}&sortBy=${sortBy}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    
    const container = document.getElementById('user-results');
    container.innerHTML = "";
    
    data.users.forEach(u => {
        const div = document.createElement('div');
        div.className = "user-list-item";
        
        const lastSeenStr = u.lastSeen ? new Date(u.lastSeen).toLocaleString('fr-FR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}) : 'Inconnue';
        
        div.innerHTML = `
            <div>
                <span style="font-weight:bold;">${u.pseudo}</span>
                <small>ID: ${u.uid}</small>
                <small style="color:#03dac6;">Activité: ${lastSeenStr}</small>
            </div>
            <button onclick="App.editUser('${u.uid}')">Éditer</button>
        `;
        container.appendChild(div);
    });
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
