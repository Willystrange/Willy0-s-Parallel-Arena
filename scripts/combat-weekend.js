window.App = window.App || {};
App.gameMode = "weekend";
App.userData = getUserData();
App.isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

App.playerCharacter = null;
App.opponentCharacter = null;
App.currentEvent = null;

// --- API SYNC ---
App.syncCombatStart = async function() {
    const connection = JSON.parse(localStorage.getItem('connection'));
    if (!connection || !connection.userid) return loadPage('connection');
    
    const user = firebase.auth().currentUser;
    const token = user ? await user.getIdToken() : '';

    const recaptchaToken = await App.getRecaptchaToken('combat_weekend_start');
    const response = await fetch('/api/combat/start', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            userId: user.uid,
            gameMode: 'weekend',
            playerCharacter: App.playerCharacter,
            opponentCharacter: App.opponentCharacter,
            recaptchaToken: recaptchaToken
        })
    });
    const data = await response.json();
    if (data.success) {
        App.playerCharacter = data.gameState.player;
        App.opponentCharacter = data.gameState.opponent;
        App.currentEvent = data.gameState.event;
        
        // Affichage de l'événement tiré par le serveur
        const label = document.getElementById("event-name");
        if (label) label.innerText = App.currentEvent;
        
        App.updateUI();
        App.updateSpecialButton();
    }
};

App.executeServerAction = async function(action, extra = {}) {
    const buttons = ['attack-button', 'special-button', 'defense-button', 'items-button'];
    buttons.forEach(id => { const b = document.getElementById(id); if(b) b.disabled = true; });

    const connection = JSON.parse(localStorage.getItem('connection'));
    const user = firebase.auth().currentUser;
    const token = user ? await user.getIdToken() : '';

    const response = await fetch('/api/combat/action', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: connection.userid, action, ...extra })
    });

    const data = await response.json();
    if (data.success) {
        const results = data.results;
        
        if (results.logs) {
            for (const log of results.logs) {
                App.addCombatLog(log.text, log.color, log.side);
                if (!log.text.startsWith('Tour')) await new Promise(r => setTimeout(r, 600));
            }
        }

        App.playerCharacter = data.game.player;
        App.opponentCharacter = data.game.opponent;
        
        App.updateUI();
        App.updateSpecialButton();

        if (results.gameOver) {
            if (data.results.updatedUserData) {
                localStorage.setItem('userData', JSON.stringify(data.results.updatedUserData));
            }
            if (data.results.masteryGameResult) {
                sessionStorage.setItem('masteryGameResult', JSON.stringify(data.results.masteryGameResult));
            }
            
            // --- NETTOYAGE SESSION ---
            sessionStorage.removeItem('playerCharacter');
            sessionStorage.removeItem('opponentCharacter');
            const cheatBtn = document.getElementById('cheat-btn-dev');
            if (cheatBtn) cheatBtn.remove();

            setTimeout(() => {
                sessionStorage.setItem("gameMode", "weekend");
                loadPage("fin_partie");
            }, 2000);
        } else {
            buttons.forEach(id => { const b = document.getElementById(id); if(b) b.disabled = false; });
        }
    }
};

// --- HANDLERS ---
App.handleAttack = () => App.executeServerAction('attack');
App.handlePlayerDefense = () => App.executeServerAction('defend');
App.useSpecialAbility = () => App.executeServerAction('special');

// --- UI & WHEEL ---
App.events = ["PV égaux", "Chargement /2", "Sans défense", "Sans objet", "Points X2", "XP X2", "Rage", "Armure fragile", "Récupération rapide", "Malédiction", "Bénédiction"];

App.spinEventWheel = () => {
  const wheel = document.getElementById("event-wheel");
  const label = document.getElementById("event-name");
  let spinCount = 0;
  const totalSpins = 15;

  wheel.style.display = "block";

  const interval = setInterval(() => {
    const idx = Math.floor(Math.random() * App.events.length);
    label.innerText = App.events[idx];
    spinCount++;

    if (spinCount > totalSpins) {
      clearInterval(interval);
      // On lance la synchro serveur qui va écraser le visuel avec le vrai événement
      App.syncCombatStart().then(() => {
          setTimeout(() => {
              wheel.style.display = "none";
              if (App.playerCharacter.nodefense) {
                  const defBtn = document.getElementById('defense-button');
                  if(defBtn) defBtn.style.display = 'none';
              }
              if (App.playerCharacter.noobject) {
                  const itemBtn = document.getElementById('items-button');
                  if(itemBtn) itemBtn.style.display = 'none';
              }
          }, 2000);
      });
    }
  }, 150);
};

// --- INITIALIZATION ---
{
    const p = sessionStorage.getItem('playerCharacter');
    const o = sessionStorage.getItem('opponentCharacter');
    if (p && o) {
        App.playerCharacter = JSON.parse(p);
        App.opponentCharacter = JSON.parse(o);
        App.initializeCharacterProperties(App.playerCharacter, true);
        App.initializeCharacterProperties(App.opponentCharacter, false);
        
        App.spinEventWheel();
    } else {
        loadPage('index');
    }
}

App.userData.partie_commencee_weekend = true;
saveUserData(App.userData);

if (App.playerCharacter && App.playerCharacter.name === "Boompy") {
  const specBtn = document.getElementById('special-button');
  if(specBtn) specBtn.style.display = 'none';
}

// --- INJECTION BOUTON DE TRICHE (DEV) ---
(function injectCheatButton() {
    const btn = document.createElement('button');
    btn.id = 'cheat-btn-dev';
    btn.innerText = 'TERMINER PARTIE (DEV)';
    btn.style.cssText = 'position:fixed; top:10px; right:10px; z-index:999999; background:red; color:white; border:2px solid white; border-radius:10px; padding:12px; font-weight:bold; cursor:pointer; box-shadow: 0 0 15px rgba(0,0,0,0.5);';
    btn.onclick = () => App.executeServerAction('cheat_win');
    document.body.appendChild(btn);
})();

document.body.addEventListener('click', function(e) {
  if (e.target.closest('#toggle-stats')) App.toggleStatsPanel();
});

App.initStatsPanelState();
App.updateUI();
App.updateSpecialButton();