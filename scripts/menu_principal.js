// Créer ou récupérer le namespace App
window.App = window.App || {};

sessionStorage.setItem("lastPage", 'menu_principal');

// --- Partie Firebase et initialisations globales ---

// --- Gestion des données utilisateurs ---
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    App.User = true;
    App.userId = user.uid;
    let currentUserData = getUserData();
    saveUserData(currentUserData);
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

  // Samedi à partir de 09h00
  if (day === 6 && hour >= 9) return true;
  // Tout le dimanche
  if (day === 0) return true;
  // Lundi jusqu'à 09h00
  if (day === 1 && hour < 9) return true;

  return false;
};


App.updateTrophyProgress = function() {
  const userData = getUserData();
  const trophies = userData.trophees || 0;
  const rewardPals = [
    { trophies: 10 }, { trophies: 20 }, { trophies: 30 }, { trophies: 40 },
    { trophies: 60 }, { trophies: 80 }, { trophies: 100 }, { trophies: 120 },
    { trophies: 150 }, { trophies: 180 }, { trophies: 220 }, { trophies: 260 },
    { trophies: 300 }, { trophies: 350 }, { trophies: 400 }, { trophies: 460 },
    { trophies: 520 }, { trophies: 580 }, { trophies: 650 }, { trophies: 720 },
    { trophies: 800 }, { trophies: 880 }, { trophies: 970 }, { trophies: 1060 },
    { trophies: 1150 }, { trophies: 1250 }, { trophies: 1350 }, { trophies: 1460 },
    { trophies: 1570 }, { trophies: 1690 }
  ];
  let previousThreshold = 0, nextThreshold = rewardPals[0].trophies, currentIndex = 0;
  for (let i = 0; i < rewardPals.length; i++) {
    if (trophies < rewardPals[i].trophies) {
      nextThreshold = rewardPals[i].trophies;
      currentIndex = i;
      break;
    } else {
      previousThreshold = rewardPals[i].trophies;
    }
    if (i === rewardPals.length - 1) {
      nextThreshold = rewardPals[i].trophies;
      currentIndex = i;
    }
  }
  let progress = previousThreshold === 0 ? (trophies / nextThreshold) * 100
    : ((trophies - previousThreshold) / (nextThreshold - previousThreshold)) * 100;
  progress = Math.min(progress, 100);
  const progressFill = document.getElementById("trophiesProgressFill");
  if (progressFill) {
    progressFill.style.width = progress + "%";
  }
  const nextRewardsElem = document.getElementById("nextRewards");
  if (nextRewardsElem) {
    let rewardText = "Prochaine récompense à " + nextThreshold + " trophées : 1 récompense aléatoire";
    if ((currentIndex + 1) % 8 === 0) { rewardText += " et un nouveau personnage aléatoire"; }
    nextRewardsElem.textContent = rewardText;
  }
};

// --- Gestion de l'en-tête avec glissement ---
App.headerM = document.getElementById("header");
App.interactionZone = document.querySelector(".interaction-zone");
App.startY = 0;
App.isDragging = false;
App.minHeight = 60;
App.maxHeight = window.innerHeight;

if (App.interactionZone && App.headerM) {
  // Pour les appareils tactiles
  App.interactionZone.addEventListener("touchstart", (e) => {
    App.startY = e.touches[0].clientY;
    App.isDragging = true;
    App.headerM.style.transition = "none";
  });
  App.interactionZone.addEventListener("touchmove", (e) => {
    if (!App.isDragging) return;
    const deltaY = e.touches[0].clientY - App.startY;
    const currentHeaderHeight = parseInt(App.headerM.style.height) || App.minHeight;
    const newHeight = Math.min(App.maxHeight, Math.max(App.minHeight, currentHeaderHeight + deltaY));
    App.headerM.style.height = `${newHeight}px`;
    App.updateStatsPosition(newHeight);
  });
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
  if (stats) {
    if (currentHeight > App.minHeight + 40) {
      stats.style.opacity = "1";
      stats.style.transform = `translateY(${(currentHeight - App.minHeight) / 2}px)`;
    } else {
      stats.style.opacity = "0";
      stats.style.transform = "translateY(20px)";
    }
  }
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
};

// --- Navigation et sélection de mode ---
App.viewQuests = function() { loadPage('quetes'); };
App.goToPasse = function() { loadPage('passe_de_combat'); };
App.goToSettings = function() { loadPage('parametres'); };
App.goToActualites = function() { loadPage('actualites'); };
App.viewCharacters = function() { loadPage('perso_stats'); };
App.viewShop = function() { loadPage('boutique'); };
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

  // n'affiche le bouton que si on est dans la période week-end
  weekendBtn.style.display = App.isWeekendPeriod() ? '' : 'none';

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
  const userData = getUserData();
  if (mode === 'classique') {
    userData.classicGames = (userData.classicGames || 0) + 1;
    saveUserData(userData);
    loadPage('characters');
  } else if (mode === 'survie') {
    userData.survivalGames = (userData.survivalGames || 0) + 1;
    saveUserData(userData);
    loadPage('characters_survie');
  } else if (mode === 'classique-weeknd') {
    loadPage('characters-weekend');
  }
};

App.StartedGame = function() {
  const userData = getUserData();
  if (userData.partie_commencee) {
    loadPage('combat');
  } else if (userData.partie_commencee_weekend) {
    loadPage('combat-weekend');
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
    userData.fraude = (userData.fraude || 0) - 1;
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

App.checkAndAskForUsername = function() {
  let userData = getUserData();
  if (!userData.pseudo || userData.pseudo.trim().length === 0 || userData.pseudo.length > 13) {
    let pseudo = null;
    while (!pseudo || pseudo.trim().length === 0 || pseudo.length > 13) {
      pseudo = prompt("Veuillez entrer votre pseudo (maximum 13 caractères, sans espaces vides) :");
      if (pseudo && pseudo.trim().length > 0 && pseudo.length <= 13) {
        userData.pseudo = pseudo.trim();
        saveUserData(userData);
      }
    }
  }
};

App.init = function() {
  let userData = getUserData();
  if (userData.version !== game_version) {
    loadPage('mise_a_jour');
  }
  App.resetDoubleXPIfNeeded();
  if (userData.recompense > 0 || userData.perso_recompense > 0) {
    loadPage('recompenses');
  }
  App.checkAndAskForUsername();
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
  const day = now.getDay();               // 0=dimanche … 6=samedi
  let diff = (8 - day) % 7;
  if (day === 1 && now < next) diff = 0;  // lundi avant 9h → même jour
  if (day !== 1 && diff === 0) diff = 7;
  next.setDate(now.getDate() + diff);
  return next;
};

// met à jour le texte du compte à rebours
App.updateWeekendCountdown = function() {
  const timer = document.getElementById('weekendTimer');
  const span  = document.getElementById('countdown');
  const btn   = document.getElementById('weekendButton');
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
App.init();
userData = getUserData();
saveUserData(userData);
// Assure que le bouton "Annuler" appelle toujours App.closeModeSelection()