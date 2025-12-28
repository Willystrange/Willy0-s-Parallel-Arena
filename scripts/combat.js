window.App = window.App || {};
App.gameMode = 'classic';

App.userData = getUserData();

// Déclaration globale des variables dans le namespace app
App.playerCharacter = null;
App.opponentCharacter = null;
App.specialAbility = 0;
App.isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

// Détection du mode d'affichage (standalone ou non)
if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
  document.body.classList.add('web-app');
} else {
  document.body.classList.add('normal-app');
}

// Chargement de la sauvegarde de partie depuis localStorage
App.sauvegarde = App.loadGame();

{
    const storedUserData = getUserData();
    if (storedUserData.partie_commencee && App.sauvegarde) {
      App.playerCharacter = App.sauvegarde.playerCharacter;
      App.opponentCharacter = App.sauvegarde.opponentCharacter;
      App.updateUI();
    } else {
      const storedPlayer = sessionStorage.getItem('playerCharacter');
      if (storedPlayer) {
        App.playerCharacter = JSON.parse(storedPlayer);
        App.initializeCharacterProperties(App.playerCharacter, true);
      } else {
        loadPage('index');
      }

      const storedOpponent = sessionStorage.getItem('opponentCharacter');
      if (storedOpponent) {
        App.opponentCharacter = JSON.parse(storedOpponent);
        App.initializeCharacterProperties(App.opponentCharacter, false);
      } else {
        loadPage('index');
      }
    }
}

// Effet légendaire: Bottes d'Hermès (au début du combat)
if (App.playerCharacter.tour === 1 && App.playerCharacter.tourTT < 2) {
    const firstActor = App.playerCharacter.vitesse >= App.opponentCharacter.vitesse ? App.playerCharacter : App.opponentCharacter;
    const hasHermesBoots = (firstActor.equipments || []).includes('bottes_hermes');

    if (hasHermesBoots && !firstActor.hermesBootsTriggered) {
        const equipment = (window.equipments || []).find(eq => eq.id === 'bottes_hermes');
        if (equipment && equipment.bonus && equipment.bonus.effect) {
            firstActor.bonusDamageNextAttack = (firstActor.bonusDamageNextAttack || 0) + equipment.bonus.effect.value;
            firstActor.hermesBootsTriggered = true;
            App.addCombatLog(`Grâce à ${equipment.name}, la première attaque de ${firstActor.name} est renforcée !`, 'cyan', 'milieu');
        }
    }
}

App.saveGame(App.playerCharacter, App.opponentCharacter);

// Empêche le retour en arrière dans l'historique du navigateur
history.replaceState(null, null, window.location.href);

// Initialisation du combat sur le serveur
App.syncCombatStart = async function() {
    const connection = JSON.parse(localStorage.getItem('connection'));
    if (!connection || !connection.userid) return;

    const user = firebase.auth().currentUser;
    if (!user) return;

    const token = await user.getIdToken();
    const recaptchaToken = await App.getRecaptchaToken('combat_start');

    await fetch('/api/combat/start', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            userId: user.uid,
            gameMode: 'classic',
            playerCharacter: App.playerCharacter,
            opponentCharacter: App.opponentCharacter,
            recaptchaToken: recaptchaToken
        })
    });

    // Une fois synchronisé, si l'adversaire est plus rapide, il joue
    if (App.playerCharacter.vitesse < App.opponentCharacter.vitesse && App.playerCharacter.tourTT < 1) {
        App.executeServerAction('opponent_init');
    }
};

App.syncCombatStart();

    const data = await response.json();
    if (data.success) {
        const results = data.results;
        
        // Afficher les logs dans l'ordre CHRONOLOGIQUE avec un petit délai
        if (results.logs) {
            for (const log of results.logs) {
                App.addCombatLog(log.text, log.color, log.side);
                // Si le log n'est pas un message de tour, on attend un peu pour l'immersion
                if (!log.text.startsWith('Tour')) {
                    await new Promise(resolve => setTimeout(resolve, 600));
                }
            }
        }

        // Mettre à jour l'état final
        App.playerCharacter = data.game.player;
        App.opponentCharacter = data.game.opponent;
        
        App.updateUI();
        App.updateSpecialButton();

        if (results.gameOver) {
            // Mise à jour capitale pour l'écran de fin
            if (data.results.updatedUserData) {
                localStorage.setItem('userData', JSON.stringify(data.results.updatedUserData));
            }
            if (data.results.masteryGameResult) {
                sessionStorage.setItem('masteryGameResult', JSON.stringify(data.results.masteryGameResult));
            }
            sessionStorage.setItem("gameMode", "classic");
            
            // --- NETTOYAGE SESSION ---
            sessionStorage.removeItem('playerCharacter');
            sessionStorage.removeItem('opponentCharacter');
            const cheatBtn = document.getElementById('cheat-btn-dev');
            if (cheatBtn) cheatBtn.remove();

            setTimeout(() => loadPage('fin_partie'), 2000);
        } else {
            buttons.forEach(id => { const b = document.getElementById(id); if(b) b.disabled = false; });
        }
    }
};

// Redéfinition des handlers
App.updateTour = function() {}; // Géré par le serveur

App.handleAttack = function() {
    App.executeServerAction('attack');
};

App.handlePlayerDefense = function() {
    App.executeServerAction('defend');
};

App.useSpecialAbility = function() {
    App.executeServerAction('special');
};

App.updateUI();
App.updateSpecialButton();

App.partie = function() {
  App.userData.partie_commencee = true;
  saveUserData(App.userData);
}
App.partie();

// 4) Écouteur délégué
document.body.addEventListener('click', function(e) {
  if (e.target.closest('#toggle-stats')) {
    App.toggleStatsPanel();
  }
});

App.initStatsPanelState();

if (App.playerCharacter.name === "Boompy") {
  const specBtn = document.getElementById('special-button');
  if(specBtn) specBtn.style.display = 'none';
}

// --- INJECTION BOUTON DE TRICHE (DEV) ---
(function injectCheatButton() {
    if (document.getElementById('cheat-btn-dev')) return;
    const btn = document.createElement('button');
    btn.id = 'cheat-btn-dev';
    btn.innerText = 'TERMINER PARTIE (DEV)';
    btn.style.cssText = 'position:fixed; top:10px; right:10px; z-index:999999; background:red; color:white; border:2px solid white; border-radius:10px; padding:12px; font-weight:bold; cursor:pointer; box-shadow: 0 0 15px rgba(0,0,0,0.5);';
    btn.onclick = () => App.executeServerAction('cheat_win');
    document.body.appendChild(btn);
})();

App.useItem = function(itemName) {
  App.playerCharacter.objets_utilise = 1;
  const effect = App.itemEffects[itemName];
  if (effect) {
    effect(App.userData, App.playerCharacter);
  }
  saveUserData(App.userData);
  App.hideItemSelection();
  
  App.executeServerAction('use_item', { itemName: itemName });
};
