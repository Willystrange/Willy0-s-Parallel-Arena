window.App = window.App || {};
App.gameMode = "weekend";
App.userData = getUserData();
App.isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
App.playerCharacter = null;
App.opponentCharacter = null;
App.currentEvent = null;

// --- INITIALIZATION ---
(async function() {
    // TRADUCTION
    if (App.translationPromise) {
        await App.translationPromise;
        App.translatePage();
    }

    // Ensure equipments data is loaded for AI item generation
    if (typeof App.loadEquipmentsData === 'function') {
        await App.loadEquipmentsData();
    }

    const p = sessionStorage.getItem('playerCharacter');
    const o = sessionStorage.getItem('opponentCharacter');
    if (p && o) {
        App.playerCharacter = JSON.parse(p);
        App.opponentCharacter = JSON.parse(o);
        App.initializeCharacterProperties(App.playerCharacter, true);
        App.initializeCharacterProperties(App.opponentCharacter, false);
        
        // Specific Weekend Logic: Spin Wheel, then Sync
        setTimeout(() => App.spinEventWheel(), 100);
    } else {
        loadPage('index');
    }
})();

// --- SYNC ---
App.doCombatStart = async function() {
    // Called by spinEventWheel when animation finishes
    const data = await App.combatManager.syncCombatStart('weekend');
    if (data && data.success) {
        App.playerCharacter = data.gameState.player;
        App.opponentCharacter = data.gameState.opponent;
        App.currentEvent = data.gameState.event;
        
        const label = document.getElementById("event-name");
        if (label) label.innerText = App.t(`combat.weekend.events.${App.currentEvent}`);
        
        App.updateUI();
        App.updateSpecialButton();
    }
    return data;
};

// --- ACTIONS ---
App.executeServerAction = async function(action, extra = {}) {
    const data = await App.combatManager.executeAction(action, extra);
    if (data && data.success) {
        App.playerCharacter = data.game.player;
        App.opponentCharacter = data.game.opponent;
        
        App.updateUI();
        App.updateSpecialButton();

        if (data.results.gameOver) {
            App.combatManager.handleGameOver(data, 'weekend');
        }
    }
};

App.handleAttack = () => App.executeServerAction('attack');
App.handlePlayerDefense = () => App.executeServerAction('defend');
App.useSpecialAbility = () => App.executeServerAction('special');

// --- WHEEL LOGIC ---
App.events = ["PV égaux", "Chargement /2", "Sans défense", "Sans objet", "Points X2", "XP X2", "Rage", "Armure fragile", "Récupération rapide", "Malédiction", "Bénédiction"];

App.spinEventWheel = () => {
  const wheel = document.getElementById("event-wheel");
  const label = document.getElementById("event-name");
  let spinCount = 0;
  const totalSpins = 15;

  if (wheel) wheel.style.display = "block";

  const interval = setInterval(() => {
    const idx = Math.floor(Math.random() * App.events.length);
    if (label) label.innerText = App.t(`combat.weekend.events.${App.events[idx]}`);
    spinCount++;

    if (spinCount > totalSpins) {
      clearInterval(interval);
      // On lance la synchro serveur qui va écraser le visuel avec le vrai événement
      App.doCombatStart().then(() => {
          setTimeout(() => {
              if (wheel) wheel.style.display = "none";
              // Apply visuals for disabled buttons
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

App.userData.partie_commencee_weekend = true;
saveUserData(App.userData);

if (App.playerCharacter && App.playerCharacter.name === "Boompy") {
  const specBtn = document.getElementById('special-button');
  if(specBtn) specBtn.style.display = 'none';
}

// Cheat Dev
(function injectCheatButton() {
    const btn = document.createElement('button');
    btn.id = 'cheat-btn-dev';
    btn.innerText = 'VICTOIRE (DEV)';
    btn.style.cssText = 'position:fixed; top:10px; right:10px; z-index:999999; background:red; color:white; border:2px solid white; border-radius:10px; padding:12px; cursor:pointer;';
    btn.onclick = () => App.executeServerAction('cheat_win');
    document.body.appendChild(btn);
})();

document.body.addEventListener('click', function(e) {
  if (e.target.closest('#toggle-stats')) App.toggleStatsPanel();
});
App.initStatsPanelState();
App.updateUI();
App.updateSpecialButton();