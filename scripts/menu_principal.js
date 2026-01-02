// Créer ou récupérer le namespace App
window.App = window.App || {};

var game_version = App.game_version;

sessionStorage.setItem("lastPage", 'menu_principal');

// --- Gestion des données utilisateurs ---
if (window.firebaseConfig && !firebase.apps.length) {
    firebase.initializeApp(window.firebaseConfig);
}

firebase.auth().onAuthStateChanged(async user => {
  if (user) {
    App.User = true;
    App.userId = user.uid;
    const token = await user.getIdToken();
    
    // Chargement initial depuis le serveur local
    const response = await fetch(`/api/user/${user.uid}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (data.success && data.userData) {
        localStorage.setItem('userData', JSON.stringify(data.userData));
    }

    let currentUserData = getUserData();
    saveUserData(currentUserData);
    //App.connectToGameServer(App.userId);
  } else {
    // Aucun utilisateur authentifié
  }
});




App.trophyVerif = function() {
  let userData = getUserData();
  if (userData.trophees > userData.tropheesMax) {
    userData.tropheesMax = userData.trophees;
    saveUserData(userData);
  }
};

App.displayUserInfo = function() {
  const userData = getUserData();
  const pseudoTitle = document.getElementById('pseudoTitle');
  if (pseudoTitle) {
    pseudoTitle.querySelector('span').innerText = userData.pseudo || 'Pseudo inconnu';
  }
};

App.updateStats = function() {
  const userData = getUserData();

  const currentTrophiesElem = document.getElementById("currentTrophies");
  if (currentTrophiesElem) {
    currentTrophiesElem.textContent = userData.trophees || 0;
  }
  const maxTrophiesElem = document.getElementById("maxTrophies");
  if (maxTrophiesElem) {
    maxTrophiesElem.textContent = userData.tropheesMax || 0;
  }
  const classicWinsElem = document.getElementById("classicWins");
  if (classicWinsElem) {
    classicWinsElem.textContent = userData.victoires || 0;
  }
  const survivalWinsElem = document.getElementById("survivalWins");
  if (survivalWinsElem) {
    survivalWinsElem.textContent = userData.manches_max || 0;
  }
  const classicGamesElem = document.getElementById("classicGames");
  if (classicGamesElem) {
    classicGamesElem.textContent = userData.classicGames || 0;
  }
  const survivalGamesElem = document.getElementById("survivalGames");
  if (survivalGamesElem) {
    survivalGamesElem.textContent = userData.survivalGames || 0;
  }

  App.updateTrophyProgress();
  App.claimAvailableTrophyRewards();
};

App.isClaimingTrophy = false;

App.claimAvailableTrophyRewards = function() {
    if (App.isClaimingTrophy) return; // Empêcher les appels multiples
    
    const userData = getUserData();
    const trophies = userData.trophees || 0;
    const rewards = App.getTrophyRoadRewards();
    const user = firebase.auth().currentUser;
    if (!user) return;

    // Trouver la première récompense disponible non récupérée
    const rewardToClaim = rewards.find(r => trophies >= r.trophies && !userData[`trophy_claimed_${r.trophies}`]);

    if (rewardToClaim) {
        const milestone = rewardToClaim.trophies;
        console.log(`[TROPHY] Tentative de réclamation du palier ${milestone}`);
        App.isClaimingTrophy = true;
        
        App.getRecaptchaToken('trophy_claim').then(recaptchaToken => {
            user.getIdToken().then(token => {
                fetch('/api/trophy/claim', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ userId: user.uid, milestone: milestone, recaptchaToken: recaptchaToken })
                })
                .then(res => res.json())
                .then(data => {
                    App.isClaimingTrophy = false;
                    if (data.success) {
                        localStorage.setItem('userData', JSON.stringify(data.userData));
                        console.log(`Récompense ${milestone} récupérée !`);
                        
                        if (data.extra && data.extra.openBox) {
                            let boxes = JSON.parse(sessionStorage.getItem('boxesToOpen')) || [];
                            boxes.push(data.extra.openBox);
                            sessionStorage.setItem('boxesToOpen', JSON.stringify(boxes));
                            window.location.href = 'ouverture_coffre.html';
                        } else {
                            App.updateStats(); // Re-vérifier s'il y en a d'autres
                        }
                    } else {
                        console.error("Erreur claim:", data.error);
                        // Optionnel: marquer comme échoué temporairement pour éviter de boucler
                    }
                })
                .catch(err => {
                    App.isClaimingTrophy = false;
                    console.error(err);
                });
            });
        });
    }
};

// À placer en début de fichier, au même niveau que les autres App.xxx
App.getParisDate = function() {
  // On formate la date en US pour qu'elle soit toujours « MM/DD/YYYY, HH:MM:SS »
  const parisString = new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" });
  return new Date(parisString);
};

App.isWeekendPeriod = function() {
  const paris = App.getParisDate();
  const day = paris.getDay();    // 6 = samedi, 0 = dimanche, 1 = lundi
  const hour = paris.getHours();

  // Vendredi à partir de 09h00
  if (day === 5 && hour >= 9) return true;
  // Samedi complet
  if (day === 6) return true;
  // Tout le dimanche
  if (day === 0) return true;
  // Lundi jusqu'à 09h00
  if (day === 1 && hour < 9) return true;

  return false;
};


App.trophyRoadRewardsData = [];

App.loadTrophyRoadData = function() {
    fetch('/api/data/trophy-road')
        .then(response => response.json())
        .then(data => {
            App.trophyRoadRewardsData = data;
            console.log("Données de la route des trophées chargées.");
            App.updateTrophyProgress(); // Mettre à jour l'affichage une fois chargé
        })
        .catch(err => console.error("Erreur chargement trophées:", err));
};

App.getTrophyRoadRewards = function() {
    return App.trophyRoadRewardsData.length > 0 ? App.trophyRoadRewardsData : [];
};

App.getProceduralTrophyReward = function(trophies) {
    if (trophies < 2000) return null;

    const milestone = Math.floor(trophies / 100) * 100;
    if (milestone === 0) return null;

    const cycle = (milestone / 100) % 10; // Cycle of 10 rewards (1000 trophies)
    let reward;

    const amountMultiplier = Math.floor(milestone / 1000);

    switch (cycle) {
        case 1: // 2100, 3100, 4100, ...
            reward = { type: 'coins', amount: 100 + 100 * amountMultiplier };
            break;
        case 2: // 2200, 3200, ...
            const items = ['potion', 'epee', 'elixir', 'bouclier'];
            const randomItem = items[Math.floor(Math.random() * items.length)];
            reward = { type: 'item', id: randomItem, amount: 5 + amountMultiplier };
            break;
        case 3: // 2300, 3300, ...
            reward = { type: 'coins', amount: 200 + 150 * amountMultiplier };
            break;
        case 4: // 2400, 3400, ...
            const chests = ['Attaque', 'Défense', 'Agilité', 'Équilibre'];
            const randomChest = chests[Math.floor(Math.random() * chests.length)];
            reward = { type: 'chest', chestType: randomChest };
            break;
        case 5: // 2500, 3500, ...
            reward = { type: 'coins', amount: 400 + 250 * amountMultiplier };
            break;
        case 6: // 2600, 3600, ...
            const rareItems = ['amulette', 'cape', 'armure', 'crystal'];
            const randomRareItem = rareItems[Math.floor(Math.random() * rareItems.length)];
            reward = { type: 'item', id: randomRareItem, amount: 3 + amountMultiplier };
            break;
        case 7: // 2700, 3700, ...
            reward = { type: 'coins', amount: 600 + 300 * amountMultiplier };
            break;
        case 8: // 2800, 3800, ...
            reward = { type: 'random_chest' };
            break;
        case 9: // 2900, 3900, ...
            reward = { type: 'coins', amount: 800 + 400 * amountMultiplier };
            break;
        case 0: // 3000, 4000, ...
            reward = { type: 'random_character' };
            break;
        default:
            return null;
    }

    return { trophies: milestone, rewards: [reward] };
};

App.updateTrophyProgress = function() {
    const userData = getUserData();
    const trophies = userData.trophees || 0;

    const predefinedRewards = App.getTrophyRoadRewards();
    let nextReward = null;
    let previousThreshold = 0;

    // Find next reward and previous threshold from predefined list
    for (const reward of predefinedRewards) {
        if (trophies < reward.trophies) {
            nextReward = reward;
            break;
        }
        previousThreshold = reward.trophies;
    }

    // If all predefined are passed, find next procedural
    if (!nextReward) {
        const lastPredefinedTrophies = predefinedRewards[predefinedRewards.length - 1].trophies;
        previousThreshold = Math.max(lastPredefinedTrophies, Math.floor(trophies / 100) * 100);
        const nextMilestone = previousThreshold + 100;
        nextReward = App.getProceduralTrophyReward(nextMilestone);
    }
    
    if (!nextReward) {
        // Handle end of all rewards if procedural has a limit
        const progressFill = document.getElementById("trophiesProgressFill");
        if (progressFill) progressFill.style.width = "100%";
        const nextRewardsElem = document.getElementById("nextRewards");
        if (nextRewardsElem) nextRewardsElem.textContent = "Vous êtes au sommet !";
        return;
    }

    const nextThreshold = nextReward.trophies;
    
    let progress = (trophies - previousThreshold) / (nextThreshold - previousThreshold) * 100;
    progress = Math.max(0, Math.min(progress, 100));

    const progressFill = document.getElementById("trophiesProgressFill");
    if (progressFill) {
        progressFill.style.width = progress + "%";
    }

    const nextRewardsElem = document.getElementById("nextRewards");
    if (nextRewardsElem) {
        const rewardDescriptions = nextReward.rewards.map(r => {
            const name = r.id ? r.id.replace(/_/g, ' ') : r.chestType;
            switch (r.type) {
                case 'coins': return `${r.amount} pièces`;
                case 'item': return `${r.amount}x ${name}`;
                case 'chest': return `1x Coffre ${name}`;
                case 'random_character': return `1x Nouveau personnage`;
                case 'random': return '1x Récompense Aléatoire';
                case 'random_chest': return '1x Coffre Aléatoire';
                default: return '1x Récompense';
            }
        }).join(' et ');
        nextRewardsElem.textContent = `Prochaine récompense à ${nextThreshold} trophées : ${rewardDescriptions}`;
    }
};

// --- Gestion de l'en-tête avec glissement ---
App.headerM = document.getElementById("header");
App.interactionZone = document.querySelector(".interaction-zone");
App.startY = 0;
App.isDragging = false;
App.minHeight = 60;
App.maxHeight = window.innerHeight - 60;

if (App.interactionZone && App.headerM) {
  // Pour les appareils tactiles
  App.interactionZone.addEventListener("touchstart", (e) => {
    App.startY = e.touches[0].clientY;
    App.isDragging = true;
    App.headerM.style.transition = "none";
  }, { passive: true });
  App.interactionZone.addEventListener("touchmove", (e) => {
    if (!App.isDragging) return;
    const deltaY = e.touches[0].clientY - App.startY;
    const currentHeaderHeight = parseInt(App.headerM.style.height) || App.minHeight;
    const newHeight = Math.min(App.maxHeight, Math.max(App.minHeight, currentHeaderHeight + deltaY));
    App.headerM.style.height = `${newHeight}px`;
    App.updateStatsPosition(newHeight);
  }, { passive: true });
  App.interactionZone.addEventListener("touchend", () => {
    App.isDragging = false;
    App.finalizeHeaderHeight();
    App.updateStatsPosition(parseInt(App.headerM.style.height) || App.minHeight);
  });
}

// Pour les utilisateurs avec souris (pas d'appareils tactiles)
if (!("ontouchstart" in window) && App.interactionZone && App.headerM) {
  let dragged = false;
  App.interactionZone.addEventListener("mousedown", (e) => {
    App.startY = e.clientY;
    App.isDragging = true;
    dragged = false;
    App.headerM.style.transition = "none";
  });
  document.addEventListener("mousemove", (e) => {
    if (!App.isDragging) return;
    const deltaY = e.clientY - App.startY;
    if (Math.abs(deltaY) > 5) { dragged = true; }
    const currentHeaderHeight = parseInt(App.headerM.style.height) || App.minHeight;
    const newHeight = Math.min(App.maxHeight, Math.max(App.minHeight, currentHeaderHeight + deltaY));
    App.headerM.style.height = `${newHeight}px`;
    App.updateStatsPosition(newHeight);
  });
  document.addEventListener("mouseup", () => {
    if (App.isDragging) {
      if (!dragged) {
        const currentHeaderHeight = parseInt(App.headerM.style.height) || App.minHeight;
        if (currentHeaderHeight === App.minHeight) {
          App.headerM.style.height = `${App.maxHeight}px`;
          App.updateStatsPosition(App.maxHeight);
        } else {
          App.headerM.style.height = `${App.minHeight}px`;
          App.updateStatsPosition(App.minHeight);
        }
        App.headerM.style.transition = "height 0.2s ease";
      } else {
        App.finalizeHeaderHeight();
        App.updateStatsPosition(parseInt(App.headerM.style.height) || App.minHeight);
      }
      App.isDragging = false;
    }
  });
}

App.updateStatsPosition = function(currentHeight) {
  const stats = document.querySelector(".stats");
  if (!stats) return;

  const statsHeight = stats.getBoundingClientRect().height;
  const margin = 10;
  const screenH = window.innerHeight;
  const threshold = screenH - statsHeight - margin * 2;

  let topPos = currentHeight + margin;
  let isVisible = currentHeight > App.minHeight + 40;

  if (!isVisible) {
    // Forcer la position très basse quand les stats sont "cachées"
    topPos = 1000;
  } else if (currentHeight > threshold) {
    topPos = margin;
  }

  stats.style.top = `${topPos}px`;
  stats.style.opacity = isVisible ? "1" : "0";
  stats.style.transform = isVisible ? "translateY(0)" : "translateY(20px)";
};





App.finalizeHeaderHeight = function() {
  const currentHeaderHeight = parseInt(App.headerM.style.height) || App.minHeight;
  App.headerM.style.transition = "height 0.2s ease";
  if (currentHeaderHeight < (App.maxHeight + App.minHeight) / 6) {
    App.headerM.style.height = `${App.minHeight}px`;
  } else {
    App.headerM.style.height = `${App.maxHeight}px`;
  }
};
App.closeModeSelection = function() {
  const modeDialog = document.getElementById('modeDialog');
  if (modeDialog) {
    modeDialog.classList.remove('scale-in-top');
    modeDialog.classList.add('scale-out-top');
    setTimeout(() => {
      modeDialog.style.display = 'none';
      modeDialog.classList.remove('scale-out-top');
    }, 500);
  }
};

// La fonction d'initialisation de la vue, à appeler une fois que le contenu de la page est chargé dans le DOM
App.initView = function() {
  if (App.headerM) {
    App.headerM.style.height = `${App.minHeight}px`;
  }
  App.updateStatsPosition(App.minHeight);
  App.displayUserInfo();
  App.updateStats();

  if (localStorage.getItem('autoplayEnabled') === 'true') {
    playMusic();
  }

  // Add event listeners for info buttons and close button
  const infoButtons = document.querySelectorAll('.info-button');
  infoButtons.forEach(button => {
    button.addEventListener('click', (event) => {
      const mode = event.target.dataset.mode;
      App.showExplanation(mode);
    });
  });

  const closeButton = document.querySelector('#explanationModal .close-button');
  if (closeButton) {
    closeButton.addEventListener('click', App.closeExplanation);
  }

  // Also close modal if clicking outside content
  const modalOverlay = document.getElementById('explanationModal');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (event) => {
      if (event.target === modalOverlay) {
        App.closeExplanation();
      }
    });
  }
};

// --- Navigation et sélection de mode ---
App.viewQuests = function() { loadPage('quetes'); };
App.goToPasse = function() { loadPage('passe_de_combat'); };
App.goToSettings = function() { loadPage('parametres'); };
App.goToActualites = function() { loadPage('actualites'); };
App.viewCharacters = function() { loadPage('perso_stats'); };
App.viewShop = function() { loadPage('boutique'); };
App.viewInventory = function() { loadPage('inventaire'); };
App.showMainMenu = function() { loadPage('menu_principal'); };


App.showModeSelection = function() {
  const modeDialog = document.getElementById('modeDialog');
  if (!modeDialog) return;

  // on cible directement le bouton via son id
  const weekendBtn = document.getElementById('weekendButton');
  if (!weekendBtn) return;

  // récupère le timer s'il existe déjà à l'intérieur du bouton
  let timer = weekendBtn.querySelector('#weekendTimer');
  if (!timer) {
    // sinon on le crée et on l'ajoute au bouton
    timer = document.createElement('div');
    timer.id = 'weekendTimer';
    timer.className = 'weekend-timer';
    timer.innerHTML = `<span id="countdown"></span>`;
    weekendBtn.appendChild(timer);
  }

  // ajuste le texte du bouton sans supprimer le timer
  // on vide d'abord tout, puis on remet le texte, puis le timer
  weekendBtn.textContent = 'Week-end';
  weekendBtn.appendChild(timer);

  const isWeekend = App.isWeekendPeriod();

  // n'affiche le bouton que si on est dans la période week-end
  const weekendContainer = weekendBtn.parentElement;
  if (weekendContainer) {
    weekendContainer.style.display = isWeekend ? 'flex' : 'none';
  }

  // affiche la boîte de sélection
  modeDialog.classList.add('scale-in-top');
  modeDialog.style.display = 'flex';

  // lance la mise à jour du compte à rebours
  App.startWeekendTimer();
  App.updateWeekendCountdown();

  // gestion du bouton annuler
  const cancelBtn = modeDialog.querySelector('.cancel-button');
  if (cancelBtn) cancelBtn.onclick = App.closeModeSelection;
};
App.startGame = function(mode) {
  const userData = App.userData || getUserData();
  sessionStorage.setItem('gameMode', mode);
  if (mode === 'classique') {
    userData.classicGames = (userData.classicGames || 0) + 1;
    saveUserData(userData);
    loadPage('character-selection');
  } else if (mode === 'survie') {
    userData.survivalGames = (userData.survivalGames || 0) + 1;
    saveUserData(userData);
    loadPage('character-selection');
  } else if (mode === 'classique-weeknd') {
    loadPage('character-selection');
  }
};
App.StartedGame = function() {
  const userData = getUserData();
  if (userData.partie_commencee) {
    loadPage('combat');
  } else if (userData.partie_commencee_weekend) {
    loadPage('combat-weekend');
  } else if (userData.partie_commencee_survie) {
    loadPage('combat-survie');
  }
};

App.resetDoubleXPIfNeeded = function() {
  const now = new Date();
  const lastCheck = new Date(localStorage.getItem('lastDoubleXPCheck') || 0);
  const resetHour = 9, resetMinute = 0;
  const userData = getUserData();
  function reset() {
    userData.Double_XP = 5;
    userData.boutique_recompense = false;
    userData.XP_jour = 0;
    userData.quetes_jour = false;
    saveUserData(userData);
    localStorage.setItem('lastDoubleXPCheck', now.toISOString());
  }
  if (
    now.getDate() !== lastCheck.getDate() ||
    now.getMonth() !== lastCheck.getMonth() ||
    now.getFullYear() !== lastCheck.getFullYear()
  ) {
    if (now.getHours() > resetHour || (now.getHours() === resetHour && now.getMinutes() >= resetMinute)) {
      reset();
    }
  } else if (
    (now.getHours() > resetHour || (now.getHours() === resetHour && now.getMinutes() >= resetMinute)) &&
    (lastCheck.getHours() < resetHour || (lastCheck.getHours() === resetHour && lastCheck.getMinutes() < resetMinute))
  ) {
    reset();
  }
};

App.init = function() {
  App.loadTrophyRoadData();
  let userData = getUserData();
  if (userData.version !== game_version) {
    loadPage('mise_a_jour');
  }
  App.resetDoubleXPIfNeeded();
  if (userData.recompense > 0 || userData.perso_recompense > 0) {
    loadPage('recompenses');
  }
  // Après DOMContentLoaded ou dans App.init :
  App.displayUserInfo();
  App.trophyVerif();
  App.updateStats();
  App.StartedGame();
};

// Initialisation globale de l'app (à appeler dès que possible, par exemple dans le routeur de la SPA)
// calcule la date du prochain lundi 9h (Paris)
App.getNextMonday9AM = function() {
  const now = App.getParisDate();
  const next = new Date(now);
  next.setHours(9, 0, 0, 0);
  const day = now.getDay();               // 0=dimanche ... 6=samedi
  let diff = (8 - day) % 7;
  if (day === 1 && now < next) diff = 0;  // lundi avant 9h → même jour
  if (day !== 1 && diff === 0) diff = 7;
  next.setDate(now.getDate() + diff);
  return next;
};

// met à jour le texte du compte à rebours
App.updateWeekendCountdown = function() {
  const timer = document.getElementById('weekendTimer');
  const span = document.getElementById('countdown');
  const btn = document.getElementById('weekendButton');
  if (!timer || !span || !btn) return;

  if (btn.offsetParent !== null) {
    timer.style.display = 'flex';
    const diff = App.getNextMonday9AM() - App.getParisDate();
    if (diff <= 0) {
      span.textContent = 'Disponible !';
      return;
    }
    const h = Math.floor(diff / 3.6e6);
    const m = Math.floor((diff % 3.6e6) / 6e4);
    const s = Math.floor((diff % 6e4) / 1e3);
    span.textContent = `${h}h ${m}m ${s}s`;
  } else {
    timer.style.display = 'none';
  }
};

// démarre l’intervalle d’update (une seule fois)
App.startWeekendTimer = function() {
  if (!App._wkTimer) {
    App._wkTimer = setInterval(App.updateWeekendCountdown, 1000);
  }
};

// Retourne la date-heure à Paris
App.getParisDate = function() {
  const parisString = new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" });
  return new Date(parisString);
};

// Vérifie si c'est la première connexion du jour (jour découpé à 9h)
App.isFirstLoginOfDay = function() {
  const now = App.getParisDate();
  const dayKey = now.toISOString().slice(0, 10);
  const last = localStorage.getItem('lastLoginDay') || '';
  if (dayKey !== last && (now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() >= 0))) {
    localStorage.setItem('lastLoginDay', dayKey);
    return true;
  }
  return false;
};

// Initialisation globale
if (!App._initWrapper) {
  App._initWrapper = true;
  App._oldInit = App.init;
  App.init = function() {
    App._oldInit.apply(this, arguments);
  };
}

// --- TUTORIAL LOGIC ---
App.tutorialSteps = [
  {
    elementId: 'playButton',
    text: "Cliquez ici pour choisir un mode de jeu et commencer une partie."
  },
  {
    elementId: 'questsButton',
    text: "Consultez vos quêtes quotidiennes, hebdomadaires et spéciales ici pour gagner des récompenses."
  },
  {
    elementId: 'inventoryButton',
    text: "Accédez à votre inventaire pour voir les objets que vous avez collectés."
  },
  {
    elementId: 'header',
    text: "Faites glisser cette barre vers le bas pour voir vos statistiques détaillées."
  },
  {
    elementId: 'header',
    text: "Faites-la glisser vers le haut pour la remonter. Essayez maintenant !"
  }
];
App.currentTutorialStep = 0;

App.startTutorial = function() {
  if (localStorage.getItem('tutorial_menu_principal_completed') === 'true') {
    return;
  }
  document.getElementById('tutorialOverlay').style.display = 'flex';
  App.showTutorialStep(App.currentTutorialStep);
};

App.showTutorialStep = function(stepIndex) {
  // Remove highlight and interactive class from previous step
  if (stepIndex > 0) {
    const prevElement = document.getElementById(App.tutorialSteps[stepIndex - 1].elementId);
    if (prevElement) {
      prevElement.classList.remove('tutorial-highlight', 'tutorial-interactive');
    }
  }

  const step = App.tutorialSteps[stepIndex];
  const element = document.getElementById(step.elementId);
  const tooltip = document.getElementById('tutorialTooltip');
  const text = document.getElementById('tutorialText');
  const nextButton = document.getElementById('tutorialNextButton');

  if (!element) {
    App.endTutorial();
    return;
  }

  element.classList.add('tutorial-highlight');
  text.innerText = step.text;

  // Make the element interactive only on the last step
  if (stepIndex === App.tutorialSteps.length - 1) {
    element.classList.add('tutorial-interactive');
  }

  const rect = element.getBoundingClientRect();
  tooltip.style.top = `${rect.bottom + 10}px`;
  tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;

  // Adjust position if tooltip goes off-screen
  if (rect.bottom + tooltip.offsetHeight + 10 > window.innerHeight) {
    tooltip.style.top = `${rect.top - tooltip.offsetHeight - 10}px`;
  }
  if (rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) < 0) {
    tooltip.style.left = '10px';
  }


  if (stepIndex === App.tutorialSteps.length - 1) {
    nextButton.innerText = 'Terminer';
  } else {
    nextButton.innerText = 'Suivant';
  }
};

App.nextTutorialStep = function() {
  App.currentTutorialStep++;
  if (App.currentTutorialStep < App.tutorialSteps.length) {
    App.showTutorialStep(App.currentTutorialStep);
  } else {
    App.endTutorial();
  }
};

App.endTutorial = function() {
  const lastStep = App.tutorialSteps[App.currentTutorialStep - 1] || App.tutorialSteps[App.tutorialSteps.length - 1];
  const lastElement = document.getElementById(lastStep.elementId);
  if (lastElement) {
    lastElement.classList.remove('tutorial-highlight', 'tutorial-interactive');
  }
  document.getElementById('tutorialOverlay').style.display = 'none';
  localStorage.setItem('tutorial_menu_principal_completed', 'true');
};
// --- END TUTORIAL LOGIC ---


// --- Game Mode Explanations ---
App.gameModeExplanations = {
  'classique': {
    title: 'Mode Classique',
    text: 'Affrontez des adversaires contrôlés par l\'ordinateur dans des combats équilibrés. L\'objectif est de réduire les points de vie de votre adversaire à zéro.'
  },
  'survie': {
    title: 'Mode Survie',
    text: 'Testez votre endurance ! Affrontez des vagues d\'ennemis de plus en plus puissants. Combien de manches pourrez-vous survivre ?'
  },
  'classique-weeknd': {
    title: 'Mode Classique Weekend',
    text: 'Un mode spécial disponible uniquement le week-end ! Profitez de bonus uniques et de récompenses accrues. Les règles de base sont similaires au mode Classique.'
  }
};

App.showExplanation = function(mode) {
  const explanation = App.gameModeExplanations[mode];
  if (explanation) {
    document.getElementById('modalTitle').innerText = explanation.title;
    document.getElementById('modalText').innerText = explanation.text;
    document.getElementById('explanationModal').style.display = 'flex';
  }
};

App.closeExplanation = function() {
  document.getElementById('explanationModal').style.display = 'none';
};

App.init();
App.userData = getUserData();
saveUserData(App.userData);


App.initView();
if (document.getElementById('tutorialNextButton')) {
    document.getElementById('tutorialNextButton').addEventListener('click', App.nextTutorialStep);
}
App.startTutorial();
