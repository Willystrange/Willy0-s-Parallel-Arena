window.App = window.App || {};

// ===================== NAVIGATION =====================
App.viewCharacters = function() {
  loadPage('perso_stats');
};
App.viewShop = function() {
  loadPage('boutique');
};
App.showMainMenu = function() {
  loadPage('menu_principal');
};
App.goToPasse = function() { /* À définir si nécessaire */ };

App.StartedGame = function() {
  const userData = getUserData();
  if (userData.partie_commencee) {
    loadPage('combat');
  } else if (userData.partie_commencee_weekend) {
    loadPage('combat-weekend');
  }
};
App.StartedGame();

// ===================== PASS PREMIUM =====================
App.showPopup = function() {
  document.getElementById('premium-pass-popup').style.display = 'block';
};
App.hidePopup = function() {
  document.getElementById('premium-pass-popup').style.display = 'none';
};
App.handlePurchase = function() {
  App.hidePopup();
  const user = firebase.auth().currentUser;
  if (!user) { alert("Veuillez vous connecter"); return; }

  const loadingPopup = document.getElementById('loading-popup');
  loadingPopup.style.display = 'block';
  loadingPopup.classList.add('active');

  App.getRecaptchaToken('pass_purchase').then(recaptchaToken => {
      user.getIdToken().then(token => {
          fetch('/api/pass/buy', {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                  userId: user.uid,
                  recaptchaToken: recaptchaToken
              })
          })
          .then(res => res.json())
          .then(data => {
              loadingPopup.classList.remove('active');
              if (data.success) {
                  localStorage.setItem('userData', JSON.stringify(data.userData));
                  alert('Achat réussi, le Parallel Pass 7 Premium est maintenant disponible !');
                  alert('En cadeau, vous recevez 500 XP supplémentaire !');
                  location.reload();
              } else {
                  alert(data.error || "Erreur lors de l'achat");
                  loadingPopup.style.display = 'none';
              }
          })
          .catch(err => {
              console.error("Erreur achat pass:", err);
              loadingPopup.classList.remove('active');
              loadingPopup.style.display = 'none';
              alert("Erreur réseau");
          });
      });
  });
};


// ===================== GESTION DES NIVEAUX ET RÉCOMPENSES =====================
App.initApp = function() {
  // Éléments HTML
  const albumContainer = document.getElementById('album-container');
  const prevPageBtn = document.getElementById('prevPage');
  const nextPageBtn = document.getElementById('nextPage');
  const xpProgressBar = document.querySelector('.xp-progress-bar');
  const xpProgressText = document.getElementById('xp-progress-text');

  // Calcule les XP pour le prochain niveau
  App.calculateNextLevelXP = function(level) {
    return Math.round((50 + (level * 20)) * 1.1);
  };

  // Met à jour l'affichage du niveau et la barre de progression
  App.updateLevelInfo = function() {
    const freshData = getUserData(); // Toujours utiliser des données fraîches
    const currentLevel = parseInt(freshData.pass_level || 0);
    const currentXP = parseInt(freshData.pass_XP || 0);
    const nextLevelXP = App.calculateNextLevelXP(currentLevel);
    const xpPercentage = Math.min(100, Math.max(0, (currentXP / nextLevelXP) * 100));
    
    xpProgressText.textContent = `XP: ${currentXP} / ${nextLevelXP}`;
    xpProgressBar.style.width = `${xpPercentage}%`;
    document.getElementById('current-level').textContent = currentLevel;
    document.getElementById('next-level').textContent = currentLevel + 1;
  };

  // Vérifie et notifie les nouveaux niveaux
  App.checkLevelUp = function() {
    const freshData = getUserData();
    const currentLevel = parseInt(freshData.pass_level || 0);
    
    // Utilisation d'une clé locale unique qui ne sera pas écrasée par le serveur
    // Cela garantit que si on a vu l'alerte sur ce navigateur, on ne la revoit pas.
    const localKey = 'parallel_pass_notified_level';
    let lastNotifiedLocal = localStorage.getItem(localKey);

    // Si pas de donnée locale, on tente de prendre celle du profil utilisateur
    if (lastNotifiedLocal === null) {
        lastNotifiedLocal = freshData.pass_last_notified_level || 0;
    }
    
    lastNotifiedLocal = parseInt(lastNotifiedLocal);

    // Cas particulier : Si on charge la page et qu'on est déjà à un niveau élevé (>1)
    // mais qu'aucune notification n'est enregistrée (ex: première visite après maj),
    // on enregistre le niveau actuel sans alerte pour éviter le spam.
    if (isNaN(lastNotifiedLocal) || lastNotifiedLocal === 0) {
         if (currentLevel > 1) {
             localStorage.setItem(localKey, currentLevel);
             freshData.pass_last_notified_level = currentLevel;
             saveUserData(freshData);
             return;
         }
    }

    if (currentLevel > lastNotifiedLocal) {
      // 1. Sauvegarde locale immédiate (priorité absolue)
      localStorage.setItem(localKey, currentLevel);
      
      // 2. Sauvegarde profil (secondaire)
      freshData.pass_last_notified_level = currentLevel;
      saveUserData(freshData);
      
      App.updateLevelInfo();
      
      setTimeout(() => {
          alert(`Félicitations ! Vous avez atteint le niveau ${currentLevel}.`);
      }, 100);
    }
  };

  App.checkLevelUp();
  App.updateLevelInfo();

  // Pour l'affichage des récompenses, on a besoin d'une ref userData pour les badges
  const userData = getUserData(); 

  // Listes des récompenses
  const freeRewards = [
    { badge: 1, text: "5 Points", level: 1, type: 'points', value: 5, rarity: 'simple' },
    { badge: 2, text: "2 Potions de santé", level: 2, type: 'potion_sante', value: 2, rarity: 'simple' },
    { badge: 3, text: "Double XP", level: 3, type: 'Double_XP', value: 1, rarity: 'simple' },
    { badge: 4, text: "10 Points", level: 4, type: 'points', value: 10, rarity: 'simple' },
    { badge: 5, text: "Bouclier solide", level: 5, type: 'bouclier_solide', value: 1, rarity: 'simple' },
    { badge: 6, text: "15 Points", level: 6, type: 'points', value: 15, rarity: 'simple' },
    { badge: 7, text: "2 Épées tranchantes", level: 7, type: 'epee_tranchante', value: 2, rarity: 'simple' },
    { badge: 8, text: "Élixir de puissance", level: 8, type: 'elixir_puissance', value: 1, rarity: 'simple' },
    { badge: 9, text: "10 Points", level: 9, type: 'points', value: 10, rarity: 'simple' },
    { badge: 10, text: "Coffre d'équipement (Équilibre)", level: 10, type: 'lootbox_equilibre', rarity: 'simple' },
    { badge: 11, text: "15 Points", level: 11, type: 'points', value: 15, rarity: 'simple' },
    { badge: 12, text: "2 Potions de santé", level: 12, type: 'potion_sante', value: 2, rarity: 'simple' },
    { badge: 13, text: "2 Double XP", level: 13, type: 'Double_XP', value: 2, rarity: 'simple' },
    { badge: 14, text: "10 Points", level: 14, type: 'points', value: 10, rarity: 'simple' },
    { badge: 15, text: "2 Boucliers solides", level: 15, type: 'bouclier_solide', value: 2, rarity: 'simple' },
    { badge: 16, text: "20 Points", level: 16, type: 'points', value: 20, rarity: 'simple' },
    { badge: 17, text: "Cape de l’ombre", level: 17, type: 'cape_ombre', value: 1, rarity: 'simple' },
    { badge: 18, text: "10 Points", level: 18, type: 'points', value: 10, rarity: 'simple' },
    { badge: 19, text: "Élixir de puissance", level: 19, type: 'elixir_puissance', value: 1, rarity: 'simple' },
    { badge: 20, text: "Amulette de régénération", level: 20, type: 'amulette_regeneration', value: 1, rarity: 'simple' },
    { badge: 21, text: "10 Points", level: 21, type: 'points', value: 10, rarity: 'simple' },
    { badge: 22, text: "Armure de fer", level: 22, type: 'armure_fer', value: 1, rarity: 'simple' },
    { badge: 23, text: "2 Épées tranchantes", level: 23, type: 'epee_tranchante', value: 2, rarity: 'simple' },
    { badge: 24, text: "10 Points", level: 24, type: 'points', value: 10, rarity: 'simple' },
    { badge: 25, text: "Coffre d'équipement (Attaque)", level: 25, type: 'lootbox_attaque', rarity: 'simple' },
    { badge: 26, text: "15 Points", level: 26, type: 'points', value: 15, rarity: 'simple' },
    { badge: 27, text: "Double XP", level: 27, type: 'Double_XP', value: 1, rarity: 'simple' },
    { badge: 28, text: "2 Potions de santé", level: 28, type: 'potion_sante', value: 2, rarity: 'simple' },
    { badge: 29, text: "Élixir de puissance", level: 29, type: 'elixir_puissance', value: 1, rarity: 'simple' },
    { badge: 30, text: "10 Points", level: 30, type: 'points', value: 10, rarity: 'simple' },
    { badge: 31, text: "20 Points", level: 31, type: 'points', value: 20, rarity: 'simple' },
    { badge: 32, text: "Bouclier solide", level: 32, type: 'bouclier_solide', value: 1, rarity: 'simple' },
    { badge: 33, text: "2 Épées tranchantes", level: 33, type: 'epee_tranchante', value: 2, rarity: 'simple' },
    { badge: 34, text: "10 Points", level: 34, type: 'points', value: 10, rarity: 'simple' },
    { badge: 35, text: "Amulette de régénération", level: 35, type: 'amulette_regeneration', value: 1, rarity: 'simple' },
    { badge: 36, text: "10 Points", level: 36, type: 'points', value: 10, rarity: 'simple' },
    { badge: 37, text: "Armure de fer", level: 37, type: 'armure_fer', value: 1, rarity: 'simple' },
    { badge: 38, text: "Crystal de renouveau", level: 38, type: 'crystal_renouveau', value: 1, rarity: 'simple' },
    { badge: 39, text: "2 Potions de santé", level: 39, type: 'potion_sante', value: 2, rarity: 'simple' },
    { badge: 40, text: "Coffre d'équipement (Défense)", level: 40, type: 'lootbox_defense', rarity: 'simple' },
    { badge: 41, text: "15 Points", level: 41, type: 'points', value: 15, rarity: 'simple' },
    { badge: 42, text: "Élixir de puissance", level: 42, type: 'elixir_puissance', value: 1, rarity: 'simple' },
    { badge: 43, text: "2 Double XP", level: 43, type: 'Double_XP', value: 2, rarity: 'simple' },
    { badge: 44, text: "10 Points", level: 44, type: 'points', value: 10, rarity: 'simple' },
    { badge: 45, text: "2 Boucliers solides", level: 45, type: 'bouclier_solide', value: 2, rarity: 'simple' },
    { badge: 46, text: "20 Points", level: 46, type: 'points', value: 20, rarity: 'simple' },
    { badge: 47, text: "Cape de l’ombre", level: 47, type: 'cape_ombre', value: 1, rarity: 'simple' },
    { badge: 48, text: "10 Points", level: 48, type: 'points', value: 10, rarity: 'simple' },
    { badge: 49, text: "Amulette de régénération", level: 49, type: 'amulette_regeneration', value: 1, rarity: 'simple' },
    { badge: 50, text: "2 Potions de santé", level: 50, type: 'potion_sante', value: 2, rarity: 'simple' },
    { badge: 51, text: "10 Points", level: 51, type: 'points', value: 10, rarity: 'simple' },
    { badge: 52, text: "Crystal de renouveau", level: 52, type: 'crystal_renouveau', value: 1, rarity: 'simple' },
    { badge: 53, text: "Double XP", level: 53, type: 'Double_XP', value: 1, rarity: 'simple' },
    { badge: 54, text: "10 Points", level: 54, type: 'points', value: 10, rarity: 'simple' },
    { badge: 55, text: "Coffre d'équipement (Agilité)", level: 55, type: 'lootbox_agilite', rarity: 'simple' },
    { badge: 56, text: "Amulette de régénération", level: 56, type: 'amulette_regeneration', value: 1, rarity: 'simple' },
    { badge: 57, text: "2 Boucliers solides", level: 57, type: 'bouclier_solide', value: 2, rarity: 'simple' },
    { badge: 58, text: "10 Points", level: 58, type: 'points', value: 10, rarity: 'simple' },
    { badge: 59, text: "Cape de l’ombre", level: 59, type: 'cape_ombre', value: 1, rarity: 'simple' },
    { badge: 60, text: "7 récompenses aléatoires", level: 60, type: 'recompense', value: 7, rarity: 'simple' }
  ];
  const premiumRewards = [
    { badge: 1, text: "10 Points", level: 1, type: 'points', value: 10, rarity: 'premium' },
    { badge: 2, text: "3 Potions de santé", level: 2, type: 'potion_sante', value: 3, rarity: 'premium' },
    { badge: 3, text: "2 Double XP", level: 3, type: 'double_xp', value: 2, rarity: 'premium' },
    { badge: 4, text: "20 Points", level: 4, type: 'points', value: 20, rarity: 'premium' },
    { badge: 5, text: "Coffre d'équipement (Attaque)", level: 5, type: 'lootbox_attaque', rarity: 'premium' },
    { badge: 6, text: "20 Points", level: 6, type: 'points', value: 20, rarity: 'premium' },
    { badge: 7, text: "3 Épées tranchantes", level: 7, type: 'epee_tranchante', value: 3, rarity: 'premium' },
    { badge: 8, text: "2 Élixirs de puissance", level: 8, type: 'elixir_puissance', value: 2, rarity: 'premium' },
    { badge: 9, text: "15 Points", level: 9, type: 'points', value: 15, rarity: 'premium' },
    { badge: 10, text: "Amulette de régénération", level: 10, type: 'amulette_regeneration', rarity: 'premium' },
    { badge: 11, text: "20 Points", level: 11, type: 'points', value: 20, rarity: 'premium' },
    { badge: 12, text: "3 Potions de santé", level: 12, type: 'potion_sante', value: 3, rarity: 'premium' },
    { badge: 13, text: "3 Double XP", level: 13, type: 'double_xp', value: 3, rarity: 'premium' },
    { badge: 14, text: "15 Points", level: 14, type: 'points', value: 15, rarity: 'premium' },
    { badge: 15, text: "Coffre d'équipement (Défense)", level: 15, type: 'lootbox_defense', rarity: 'premium' },
    { badge: 16, text: "30 Points", level: 16, type: 'points', value: 30, rarity: 'premium' },
    { badge: 17, text: "Cape de l’ombre", level: 17, type: 'cape_ombre', rarity: 'premium' },
    { badge: 18, text: "15 Points", level: 18, type: 'points', value: 15, rarity: 'premium' },
    { badge: 19, text: "2 Élixirs de puissance", level: 19, type: 'elixir_puissance', value: 2, rarity: 'premium' },
    { badge: 20, text: "Coffre d'équipement (Agilité)", level: 20, type: 'lootbox_agilite', rarity: 'premium' },
    { badge: 21, text: "15 Points", level: 21, type: 'points', value: 15, rarity: 'premium' },
    { badge: 22, text: "Armure de fer", level: 22, type: 'armure_fer', rarity: 'premium' },
    { badge: 23, text: "3 Épées tranchantes", level: 23, type: 'epee_tranchante', value: 3, rarity: 'premium' },
    { badge: 24, text: "15 Points", level: 24, type: 'points', value: 15, rarity: 'premium' },
    { badge: 25, text: "Cristal de renouveau", level: 25, type: 'cristal_renouveau', rarity: 'premium' },
    { badge: 26, text: "20 Points", level: 26, type: 'points', value: 20, rarity: 'premium' },
    { badge: 27, text: "3 Double XP", level: 27, type: 'double_xp', value: 3, rarity: 'premium' },
    { badge: 28, text: "3 Potions de santé", level: 28, type: 'potion_sante', value: 3, rarity: 'premium' },
    { badge: 29, text: "2 Élixirs de puissance", level: 29, type: 'elixir_puissance', value: 2, rarity: 'premium' },
    { badge: 30, text: "Coffre d'équipement (Équilibre)", level: 30, type: 'lootbox_equilibre', rarity: 'premium' },
    { badge: 31, text: "30 Points", level: 31, type: 'points', value: 30, rarity: 'premium' },
    { badge: 32, text: "2 Boucliers solides", level: 32, type: 'bouclier_solide', value: 2, rarity: 'premium' },
    { badge: 33, text: "3 Épées tranchantes", level: 33, type: 'epee_tranchante', value: 3, rarity: 'premium' },
    { badge: 34, text: "15 Points", level: 34, type: 'points', value: 15, rarity: 'premium' },
    { badge: 35, text: "Coffre d'équipement (Attaque)", level: 35, type: 'lootbox_attaque', rarity: 'premium' },
    { badge: 36, text: "20 Points", level: 36, type: 'points', value: 20, rarity: 'premium' },
    { badge: 37, text: "Armure de fer", level: 37, type: 'armure_fer', rarity: 'premium' },
    { badge: 38, text: "Cristal de renouveau", level: 38, type: 'cristal_renouveau', rarity: 'premium' },
    { badge: 39, text: "3 Potions de santé", level: 39, type: 'potion_sante', value: 3, rarity: 'premium' },
    { badge: 40, text: "15 Points", level: 40, type: 'points', value: 15, rarity: 'premium' },
    { badge: 41, text: "20 Points", level: 41, type: 'points', value: 20, rarity: 'premium' },
    { badge: 42, text: "2 Élixirs de puissance", level: 42, type: 'elixir_puissance', value: 2, rarity: 'premium' },
    { badge: 43, text: "3 Double XP", level: 43, type: 'double_xp', value: 3, rarity: 'premium' },
    { badge: 44, text: "15 Points", level: 44, type: 'points', value: 15, rarity: 'premium' },
    { badge: 45, text: "Coffre d'équipement (Défense)", level: 45, type: 'lootbox_defense', rarity: 'premium' },
    { badge: 46, text: "30 Points", level: 46, type: 'points', value: 30, rarity: 'premium' },
    { badge: 47, text: "Cape de l’ombre", level: 47, type: 'cape_ombre', rarity: 'premium' },
    { badge: 48, text: "15 Points", level: 48, type: 'points', value: 15, rarity: 'premium' },
    { badge: 49, text: "Amulette de régénération", level: 49, type: 'amulette_regeneration', rarity: 'premium' },
    { badge: 50, text: "Coffre d'équipement (Agilité)", level: 50, type: 'lootbox_agilite', rarity: 'premium' },
    { badge: 51, text: "15 Points", level: 51, type: 'points', value: 15, rarity: 'premium' },
    { badge: 52, text: "Cristal de renouveau", level: 52, type: 'cristal_renouveau', rarity: 'premium' },
    { badge: 53, text: "2 Double XP", level: 53, type: 'double_xp', value: 2, rarity: 'premium' },
    { badge: 54, text: "15 Points", level: 54, type: 'points', value: 15, rarity: 'premium' },
    { badge: 55, text: "2 Élixirs de puissance", level: 55, type: 'elixir_puissance', value: 2, rarity: 'premium' },
    { badge: 56, text: "20 Points", level: 56, type: 'points', value: 20, rarity: 'premium' },
    { badge: 57, text: "3 Épées tranchantes", level: 57, type: 'epee_tranchante', value: 3, rarity: 'premium' },
    { badge: 58, text: "Coffre d'équipement (Équilibre)", level: 58, type: 'lootbox_equilibre', rarity: 'premium' },
    { badge: 59, text: "30 Points", level: 59, type: 'points', value: 30, rarity: 'premium' },
    { badge: 60, text: "7 récompenses aléatoires + Korb", level: 60, type: 'Personnage', value: 7, rarity: 'premium', characterName: 'Korb' }
  ];

  const rewardsPerPage = 3;
  const totalPages = Math.max(
    Math.ceil(freeRewards.length / rewardsPerPage),
    Math.ceil(premiumRewards.length / rewardsPerPage)
  );
  let currentPageIndex = 0;

  // Crée un élément de récompense
  App.createRewardElement = function(reward) {
    const div = document.createElement('div');
    div.className = `reward ${reward.rarity}`;
    div.dataset.badge = reward.badge;
    div.dataset.level = reward.level;
    div.dataset.rarity = reward.rarity;
    div.dataset.type = reward.type; // Ajout du type pour la logique de clic
    // Vérification de la récupération
    const redeemed = (reward.rarity === 'simple' && userData[`free_${reward.badge}`]) ||
      (reward.rarity === 'premium' && userData[`premium_${reward.badge}`]);
    if (redeemed) { div.classList.add('redeemed'); }
    div.innerHTML = `
      <div class="badge">${reward.badge}</div>
      ${reward.text}
      <div class="error-message hidden" id="error-${reward.badge}">Vous n'avez pas atteint le niveau nécessaire.</div>
    `;
    return div;
  };

  // Crée une page de récompenses
  App.createPage = function(pageIndex) {
    const page = document.createElement('div');
    page.className = 'page';
    
    const rewardsContainer = document.createElement('div');
    rewardsContainer.className = 'rewards-container';
    
    const freeContainer = document.createElement('div');
    freeContainer.className = 'free-rewards';
    const premiumContainer = document.createElement('div');
    premiumContainer.className = 'premium-rewards';
    
    const freeTitle = document.createElement('h2');
    freeTitle.textContent = 'Récompenses Gratuites';
    freeTitle.className = 'rewards-title';
    freeContainer.appendChild(freeTitle);
    
    const premiumTitle = document.createElement('h2');
    premiumTitle.textContent = 'Récompenses Premium';
    premiumTitle.className = 'rewards-title';
    premiumContainer.appendChild(premiumTitle);
    
    const freeStart = pageIndex * rewardsPerPage;
    for (let i = freeStart; i < freeStart + rewardsPerPage && i < freeRewards.length; i++) {
      freeContainer.appendChild(App.createRewardElement(freeRewards[i]));
    }
    
    const premiumStart = pageIndex * rewardsPerPage;
    for (let i = premiumStart; i < premiumStart + rewardsPerPage && i < premiumRewards.length; i++) {
      const elem = App.createRewardElement(premiumRewards[i]);
elem.classList.add('premium');
      premiumContainer.appendChild(elem);
    }
    
    rewardsContainer.appendChild(freeContainer);
    rewardsContainer.appendChild(premiumContainer);
    page.appendChild(rewardsContainer);
    
    return page;
  };

  // Affiche la page courante
  App.showPage = function(index) {
    // Supprime la page active actuelle
    const currentPage = albumContainer.querySelector('.page.active');
    if (currentPage) {
      currentPage.classList.remove('active');
    }

    // Crée et affiche la nouvelle page
    const newPage = App.createPage(index);
    albumContainer.innerHTML = ''; // Vide le conteneur
    albumContainer.appendChild(newPage);
    newPage.classList.add('active');

    prevPageBtn.classList.toggle('hidden', index === 0);
    nextPageBtn.classList.toggle('hidden', index === totalPages - 1);
    currentPageIndex = index;
  };

  prevPageBtn.addEventListener('click', () => {
    if (currentPageIndex > 0) {
      App.showPage(currentPageIndex - 1);
    }
  });

  nextPageBtn.addEventListener('click', () => {
    if (currentPageIndex < totalPages - 1) {
      App.showPage(currentPageIndex + 1);
    }
  });

  // Gestion du clic sur une récompense
  albumContainer.addEventListener('click', event => {
    const rewardElement = event.target.closest('.reward');
    if (!rewardElement) return;
    const badge = rewardElement.dataset.badge;
    const badgeRarity = rewardElement.dataset.rarity;
    const isPremium = (badgeRarity === 'premium');
    
    const user = firebase.auth().currentUser;
    if (!user) return;

    if (isPremium && !userData.pass_premium) {
        App.showPopup();
        return;
    }

    App.getRecaptchaToken('pass_claim').then(recaptchaToken => {
        user.getIdToken().then(token => {
            fetch('/api/pass/claim', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: user.uid,
                    badge: badge,
                    isPremium: isPremium,
                    recaptchaToken: recaptchaToken
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    localStorage.setItem('userData', JSON.stringify(data.userData));
                    rewardElement.classList.add('redeemed');
                    
                    if (data.extra && data.extra.openBox) {
                        let boxesToOpen = JSON.parse(sessionStorage.getItem('boxesToOpen')) || [];
                        boxesToOpen.push(data.extra.openBox);
                        sessionStorage.setItem('boxesToOpen', JSON.stringify(boxesToOpen));
                        loadPage('ouverture_coffre');
                    }
                } else {
                    if (data.error !== "Déjà récupéré") alert(data.error);
                }
            });
        });
    });
  });
  App.showPage(currentPageIndex);

  };
App.updateParallelPassTitle = function() {
  const userData = getUserData();
  const base = document.querySelector('.premiumA .base');
  if (userData.pass_premium) {
    base.textContent = 'Parallel Pass +';
  } else {
    base.textContent = 'Parallel Pass';
  }
}
// Appelle cette fonction une fois que userData est bien chargé
App.updateParallelPassTitle();
App.initApp();
