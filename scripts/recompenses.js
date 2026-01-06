window.App = window.App || {};

App.currentRewards = App.currentRewards || [];
App.currentIndex = App.currentIndex || 0;

App.ouvrirRecompense = async function() {
    const user = firebase.auth().currentUser;
    if (!user) return loadPage('connection');

    try {
        const token = await user.getIdToken();
        const recaptchaToken = await App.getRecaptchaToken('open_reward');

        const response = await fetch('/api/recompenses/open', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                userId: user.uid,
                recaptchaToken: recaptchaToken
            })
        });

        const data = await response.json();
        if (data.success) {
            localStorage.setItem('userData', JSON.stringify(data.userData));
            App.currentRewards = data.rewards;
            App.currentIndex = 0;
            App.displayReward();
        } else {
            console.error("Erreur ouverture récompense:", data.error);
            // Si erreur (ex: pas de récompense dispo), on retourne au menu
            loadPage('menu_principal');
        }
    } catch (e) {
        console.error("Erreur réseau:", e);
        loadPage('menu_principal');
    }
};

App.displayReward = function() {
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (!userData) { loadPage('menu_principal'); return; }

    const nameEl = document.getElementById('reward-name');
    const infoEl = document.getElementById('reward-info');

    if (!nameEl || !infoEl) {
        setTimeout(App.displayReward, 100);
        return;
    }

    // 1. Si on n'a rien à afficher, on cherche dans la session
    if (App.currentRewards.length === 0) {
        const pending = sessionStorage.getItem('pendingRewards');
        if (pending) {
            console.log("[RECOMPENSES] " + App.t('rewards.loading_quests'));
            App.currentRewards = JSON.parse(pending);
            sessionStorage.removeItem('pendingRewards');
            App.currentIndex = 0;
        } else if (userData.recompense > 0 || userData.perso_recompense > 0) {
            console.log("[RECOMPENSES] " + App.t('rewards.loading_random'));
            App.ouvrirRecompense();
            return;
        } else {
            console.log("[RECOMPENSES] " + App.t('rewards.empty'));
            loadPage('menu_principal');
            return;
        }
    }

    // 2. Sécurité : vérifier qu'on a bien un objet après le chargement
    const reward = App.currentRewards[App.currentIndex];
    if (reward) {
        nameEl.innerText = reward.name;
        infoEl.innerHTML = reward.info || App.t('rewards.quantity', {amount: reward.amount || 1});
    } else {
        loadPage('menu_principal');
    }
};

App.showNextReward = function() {
    if (App.currentIndex < App.currentRewards.length - 1) {
        App.currentIndex++;
        App.displayReward();
    } else {
        App.currentRewards = [];
        App.currentIndex = 0;
        // Re-vérifier s'il reste des récompenses de coffres après avoir fini les récompenses de quêtes
        App.displayReward();
    }
};

App.initRecompenses = function() {
    const btn = document.getElementById('continue-button');
    if (btn) btn.onclick = App.showNextReward;

    // Attendre les traductions avant le premier rendu
    if (App.translations && Object.keys(App.translations).length > 0) {
        App.translatePage();
        App.displayReward();
    } else {
        window.addEventListener('translationsLoaded', () => {
             App.translatePage();
             App.displayReward();
        }, { once: true });
        
        // Sécurité
        setTimeout(() => {
             App.translatePage();
             App.displayReward();
        }, 500);
    }
};

// Lancement unique
if (!App.recompensesInitialized) {
    App.recompensesInitialized = true;
    App.initRecompenses();
} else {
    // Si on change de page dans la SPA, on rafraîchit quand même l'affichage
    App.initRecompenses();
}