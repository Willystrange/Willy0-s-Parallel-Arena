window.App = window.App || {};
App.gameMode = 'survie';
App.isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
App.userData = getUserData();
App.playerCharacter = null;
App.opponentCharacter = null;
App.currentWave = 1;

// --- INITIALIZATION ---
{
    const storedPlayer = sessionStorage.getItem('playerCharacter');
    if (storedPlayer) {
        App.playerCharacter = JSON.parse(storedPlayer);
        App.initializeCharacterProperties(App.playerCharacter, true);
        App.playerCharacter.last_upgrade = "null";
        
        // Sync Start
        (async function() {
            const data = await App.combatManager.syncCombatStart('survie', { 
                playerCharacter: App.playerCharacter, // override default behavior slightly if needed
                opponentCharacter: null 
            });
            
            if (data && data.success) {
                App.playerCharacter = data.gameState.player;
                App.opponentCharacter = data.gameState.opponent;
                App.currentWave = data.gameState.wave || 1;
                
                if (data.gameState.waitingForUpgrade) {
                    App.showUpgradeOptions();
                }

                App.updateUI();
                App.updateSpecialButton();
            }
        })();

    } else {
        loadPage('index');
    }
}

// --- ACTIONS ---
App.executeServerAction = async function(action, extra = {}) {
    const data = await App.combatManager.executeAction(action, extra);
    if (data && data.success) {
        App.playerCharacter = data.game.player;
        App.opponentCharacter = data.game.opponent;
        App.currentWave = data.game.wave;
        
        App.updateUI();
        App.updateSpecialButton();

        if (data.results.waveCleared) {
            App.showUpgradeOptions();
        } else if (data.results.gameOver) {
            App.combatManager.handleGameOver(data, 'survie');
        } else {
            // Unlock buttons done in combatManager automatically on error, but here we success so:
            const buttons = ['attack-button', 'special-button', 'defense-button', 'items-button'];
            buttons.forEach(id => { const b = document.getElementById(id); if(b) b.disabled = false; });
        }
    }
};

App.handleAttack = () => App.executeServerAction('attack');
App.handlePlayerDefense = () => App.executeServerAction('defend');
App.useSpecialAbility = () => App.executeServerAction('special');

// --- UPGRADE LOGIC ---
App.upgradeStat = async function(stat) {
    const user = firebase.auth().currentUser;
    const token = user ? await user.getIdToken() : '';

    // Direct fetch for upgrade as it is specific to survival mode
    const response = await fetch('/api/combat/survival/upgrade', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: user.uid, stat })
    });

    const data = await response.json();
    if (data.success) {
        App.playerCharacter = data.game.player;
        App.opponentCharacter = data.game.opponent;
        App.currentWave = data.game.wave;
        
        const logColor = App.isDarkMode ? 'white' : 'black';
        App.addCombatLog(`${App.playerCharacter.name} a amélioré la stat ${stat}.`, logColor, "center");
        
        App.updateUI();
        App.hideUpgradeOptions();
        
        const buttons = ['attack-button', 'special-button', 'defense-button', 'items-button'];
        buttons.forEach(id => { const b = document.getElementById(id); if(b) b.disabled = false; });
    }
};

App.showUpgradeOptions = function() {
  const div = document.getElementById('upgrade-options');
  const last = App.playerCharacter.last_upgrade;
  div.style.display = 'block';
  div.innerHTML = '<h3>Choisissez une amélioration</h3>';

  ['pv', 'attaque', 'defense'].forEach(stat => {
    if (last === stat) return;
    const btn = document.createElement('button');
    btn.textContent = stat === 'pv' ? 'Augmenter PV' : stat === 'attaque' ? 'Augmenter Attaque' : 'Augmenter Défense';
    btn.onclick = () => App.upgradeStat(stat);
    div.appendChild(btn);
  });
};

App.hideUpgradeOptions = function() {
  document.getElementById('upgrade-options').style.display = 'none';
};

// --- UI INIT ---
if (App.playerCharacter && App.playerCharacter.name === "Boompy") {
  const specBtn = document.getElementById('special-button');
  if(specBtn) specBtn.style.display = 'none';
}

// Cheat Dev
(function injectCheatButton() {
    if (document.getElementById('cheat-btn-dev')) return;
    const btn = document.createElement('button');
    btn.id = 'cheat-btn-dev';
    btn.innerText = 'DÉFAITE (DEV)'; // Survival specific debug
    btn.style.cssText = 'position:fixed; top:10px; right:10px; z-index:999999; background:red; color:white; border:2px solid white; border-radius:10px; padding:12px; cursor:pointer;';
    btn.onclick = () => App.executeServerAction('cheat_fail'); // Simulates death? Or just win wave? 'cheat_win' wins wave usually.
    // Wait, 'cheat_fail' isn't standard. Let's stick to 'cheat_win' which wins the current wave/game.
    // Actually, looking at server.js, 'cheat_win' sets opponent PV to 0. In survival, this clears wave.
    // If we want to test game over, we need to lose. There is no 'cheat_lose'.
    // I'll leave it as is for now or use cheat_win to skip waves.
    btn.innerText = 'SKIP WAVE (DEV)';
    btn.onclick = () => App.executeServerAction('cheat_win');
    document.body.appendChild(btn);
})();

document.body.addEventListener('click', function(e) {
  if (e.target.closest('#toggle-stats')) App.toggleStatsPanel();
});
App.initStatsPanelState();
App.updateUI();
App.updateSpecialButton();