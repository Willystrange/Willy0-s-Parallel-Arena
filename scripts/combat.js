window.App = window.App || {};
App.gameMode = 'classic';
App.userData = getUserData();
App.playerCharacter = null;
App.opponentCharacter = null;
App.isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

// Mode d'affichage
if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
  document.body.classList.add('web-app');
} else {
  document.body.classList.add('normal-app');
}

// Chargement initial
App.sauvegarde = App.loadGame();

(async function() {
    // Ensure equipments data is loaded for AI item generation
    if (typeof App.loadEquipmentsData === 'function') {
        await App.loadEquipmentsData();
    }

    const storedUserData = getUserData();
    
    // TRADUCTION
    if (App.translationPromise) {
        await App.translationPromise;
        App.translatePage();
    }

    if (storedUserData.partie_commencee && App.sauvegarde) {
      App.playerCharacter = App.sauvegarde.playerCharacter;
      App.opponentCharacter = App.sauvegarde.opponentCharacter;
      App.updateUI();
    } else {
      const storedPlayer = sessionStorage.getItem('playerCharacter');
      const storedOpponent = sessionStorage.getItem('opponentCharacter');
      if (storedPlayer && storedOpponent) {
        App.playerCharacter = JSON.parse(storedPlayer);
        App.opponentCharacter = JSON.parse(storedOpponent);
        App.initializeCharacterProperties(App.playerCharacter, true);
        App.initializeCharacterProperties(App.opponentCharacter, false);
      } else {
        loadPage('index');
        return;
      }
    }

    // Effet Bottes d'Hermès (Visualisation client - le serveur l'applique aussi)
    if (App.playerCharacter && App.playerCharacter.tour === 1 && App.playerCharacter.tourTT < 2) {
        const firstActor = App.playerCharacter.vitesse >= App.opponentCharacter.vitesse ? App.playerCharacter : App.opponentCharacter;
        const hasHermesBoots = (firstActor.equipments || []).includes('bottes_hermes');
        if (hasHermesBoots && !firstActor.hermesBootsTriggered) {
            firstActor.hermesBootsTriggered = true;
            App.addCombatLog(App.t('combat.logs.hermes_boots', { name: firstActor.name }), 'cyan', 'milieu');
        }
    }

    App.saveGame(App.playerCharacter, App.opponentCharacter);
    history.replaceState(null, null, window.location.href);

    // --- SYNC START ---
    const result = await App.combatManager.syncCombatStart('classic');
    
    if (result && result.success) {
        App.playerCharacter = result.gameState.player;
        App.opponentCharacter = result.gameState.opponent;
        // Logs initiaux (ex: L'IA rapide a déjà attaqué)
        if (result.results && result.results.logs) {
            for (const log of result.results.logs) {
                App.addCombatLog(log.text, log.color, log.side);
            }
        }
        App.updateUI();
    }
})();

// --- ACTIONS ---
App.executeServerAction = async function(action, extra) {
    const data = await App.combatManager.executeAction(action, extra);
    if (data && data.success) {
        App.playerCharacter = data.game.player;
        App.opponentCharacter = data.game.opponent;
        
        App.updateUI();
        App.updateSpecialButton();

        if (data.results.gameOver) {
            App.combatManager.handleGameOver(data, 'classic');
        }
    }
};

App.handleAttack = () => App.executeServerAction('attack');
App.handlePlayerDefense = () => App.executeServerAction('defend');
App.useSpecialAbility = () => App.executeServerAction('special');
App.updateUI();
App.updateSpecialButton();

// Déclencheur flag
if (App.userData) {
    App.userData.partie_commencee = true;
    saveUserData(App.userData);
}

// UI Events
document.body.addEventListener('click', function(e) {
  if (e.target.closest('#toggle-stats')) App.toggleStatsPanel();
});
App.initStatsPanelState();

if (App.playerCharacter && App.playerCharacter.name === "Boompy") {
  const specBtn = document.getElementById('special-button');
  if(specBtn) specBtn.style.display = 'none';
}

// Cheat Dev
(function injectCheatButton() {
    if (document.getElementById('cheat-btn-dev')) return;
    const btn = document.createElement('button');
    btn.id = 'cheat-btn-dev';
    btn.innerText = 'VICTOIRE (DEV)';
    btn.style.cssText = 'position:fixed; top:10px; right:10px; z-index:999999; background:red; color:white; border:2px solid white; border-radius:10px; padding:12px; cursor:pointer;';
    btn.onclick = () => App.executeServerAction('cheat_win');
    document.body.appendChild(btn);
})();

// Surcharge locale pour useItem (qui appelle ensuite le serveur)
App.useItem = function(itemName) {
  App.hideItemSelection();
  App.executeServerAction('use_item', { itemName: itemName });
};
