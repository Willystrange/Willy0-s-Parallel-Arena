window.App = window.App || {};

/* ===================== NAVIGATION ===================== */
App.viewCharacters = function() {
  loadPage("perso_stats");
}
App.goToPasse = function() {
  loadPage("passe_de_combat");
}
App.showMainMenu = function() {
  loadPage("menu_principal");
}

/* ===================== SUPPRESSION DES TRADUCTIONS ===================== */
// Les configurations et dictionnaires de traductions ont été retirés.
// Les textes en français sont directement codés en dur.

// Mise à jour des labels de stock
document.querySelectorAll('.stock-label').forEach(el => {
  el.textContent = "En stock : ";
});

// MISE À JOUR DES TEXTES STATIQUES
document.getElementById('balance').textContent =
  "Solde : " + (JSON.parse(localStorage.getItem('userData'))?.argent || 0);
document.getElementById('search-bar').placeholder = "Rechercher un objet";
document.getElementById('dailyoffers').textContent = "Offres Journalières";

// Mise à jour du titre principal et des catégories
App.content = document.querySelector('.content');
if (App.content) {
  App.content.querySelector('h1').textContent = "Bienvenue dans la Boutique de Jeux";
  document.getElementById('xptitle').textContent = "Catégorie XP";
  document.getElementById('soinstitle').textContent = "Catégorie Soins";
  document.getElementById('attaquetitle').textContent = "Catégorie Attaque";
  document.getElementById('defensetitle').textContent = "Catégorie Défense";
  document.getElementById('autretitle').textContent = "Catégorie Autre";
}

// Mise à jour des bonus statiques par catégorie
App.updateBonusText = function(id, bonusKey) {
  const el = document.getElementById(id);
  if (el) {
    const texts = {
      xp_2: {
        alt: "Double XP Bonus",
        title: "Double XP",
        description: "Profitez du double XP lors de vos combats !"
      },
      potion: {
        alt: "Potion de Santé",
        title: "Potion de Santé",
        description: "Augmente les PV du joueur de 1100."
      },
      amulette: {
        alt: "Amulette de Régénération",
        title: "Amulette de Régénération",
        description: "Régénère 2% des PV max par tour."
      },
      epee: {
        alt: "Épée Tranchante",
        title: "Épée Tranchante",
        description: "Augmente l'attaque du joueur de 5%."
      },
      elixir: {
        alt: "Élixir de Puissance",
        title: "Élixir de Puissance",
        description: "Augmente l'attaque de 50 points."
      },
      bouclier: {
        alt: "Bouclier solide",
        title: "Bouclier solide",
        description: "Augmente la défense de 15 points."
      },
      cape: {
        alt: "Cape de l'ombre",
        title: "Cape de l'ombre",
        description: "Ignore les dégâts subis par la prochaine attaque."
      },
      armure: {
        alt: "Armure de Fer",
        title: "Armure de Fer",
        description: "Réduit les dégâts reçus de 10%."
      },
      crystal: {
        alt: "Crystal de renouveau",
        title: "Crystal de renouveau",
        description: "Recharge 0.8 points de la capacité spéciale."
      }
    };
    el.querySelector('img').alt = texts[bonusKey].alt;
    el.querySelector('h2').textContent = texts[bonusKey].title;
    const ps = el.querySelectorAll('p');
    if (ps.length > 0) {
      ps[0].textContent = texts[bonusKey].description;
    }
  }
}
App.updateBonusText('xp-2', 'xp_2');
App.updateBonusText('potion', 'potion');
App.updateBonusText('amulette', 'amulette');
App.updateBonusText('epee', 'epee');
App.updateBonusText('elixir', 'elixir');
App.updateBonusText('bouclier', 'bouclier');
App.updateBonusText('cape', 'cape');
App.updateBonusText('armure', 'armure');
App.updateBonusText('crystal', 'crystal');

// Mise à jour des alt des icônes du footer
App.footerImgs = document.querySelectorAll('.footer img');
if (App.footerImgs.length >= 4) {
  App.footerImgs[0].alt = "Personnages";
  App.footerImgs[1].alt = "Menu Principal";
  App.footerImgs[2].alt = "Passe de combat";
  App.footerImgs[3].alt = "Boutique";
}

// MISE À JOUR DES BOUTONS "ACHETER" STATIQUES
App.updateStaticBuyButtons = function() {
  document.querySelectorAll('.bonus-item .buyButton').forEach(button => {
    button.textContent = "Acheter";
  });
}
// MISE À JOUR DES OPTIONS DES SELECT (le mot "points" reste inchangé)
App.updateStaticOptions = function() {
  document.querySelectorAll('.quantity-select option').forEach(option => {
    option.textContent = option.textContent.replace(/points/gi, "points");
  });
}
App.updateStaticBuyButtons();
App.updateStaticOptions();

/* ===================== FONCTIONS D'OFFRES JOURNALIÈRES ===================== */
App.applyDiscount = function(price) {
  return Math.round(price * 0.8); // Réduction de 20%
}
App.getRandomInt = function(max) {
  return Math.floor(Math.random() * max);
}
App.generateDailyOffers = function() {
  const today = new Date().toDateString();
  let dailyOffers = JSON.parse(localStorage.getItem('dailyOffers')) || {};
  const dailyCategory = document.getElementById('category-daily');
  if (dailyOffers.date === today) {
    return dailyOffers;
  }
  // Efface les anciennes offres
  dailyCategory.innerHTML = '';
  // Ajoute la récompense gratuite
  const rewardItem = document.createElement('div');
  rewardItem.classList.add('bonus-item');
  rewardItem.innerHTML = `
      <img src="recompense.png" alt="Récompense Gratuite">
      <h2>Récompense Gratuite</h2>
      <p>Profitez d'une récompense gratuite aujourd'hui !</p>
      <p>Prix : 0 Points</p>
      <button class="claimButton">Réclamer</button>
      <p class="error-message"></p>
    `;
  dailyCategory.appendChild(rewardItem);

  // Tableau d'items pour l'offre journalière
  App.items = [
    { img: "XP_2.png", title: "Double XP x1", description: "Profitez du double XP lors de vos combats !", price: 15, type: "xp", quantity: 1 },
    { img: "XP_2.png", title: "Double XP x3", description: "Profitez du double XP lors de vos combats !", price: 41, type: "xp", quantity: 3 },
    { img: "XP_2.png", title: "Double XP x5", description: "Profitez du double XP lors de vos combats !", price: 65, type: "xp", quantity: 5 },
    { img: "Potion-1.png", title: "Potion de Santé x1", description: "Augmente les PV du joueur de 1100.", price: 10, type: "potion", quantity: 1 },
    { img: "Potion-1.png", title: "Potion de Santé x3", description: "Augmente les PV du joueur de 1100.", price: 28, type: "potion", quantity: 3 },
    { img: "Potion-1.png", title: "Potion de Santé x5", description: "Augmente les PV du joueur de 1100.", price: 44, type: "potion", quantity: 5 },
    { img: "Amulette-1.png", title: "Amulette de Régénération x1", description: "Régénère 2% des PV max par tour.", price: 28, type: "amulette", quantity: 1 },
    { img: "Amulette-1.png", title: "Amulette de Régénération x3", description: "Régénère 2% des PV max par tour.", price: 77, type: "amulette", quantity: 3 },
    { img: "Amulette-1.png", title: "Amulette de Régénération x5", description: "Régénère 2% des PV max par tour.", price: 122, type: "amulette", quantity: 5 },
    { img: "epee-1.png", title: "Épée Tranchante x1", description: "Augmente l'attaque du joueur de 5%.", price: 15, type: "epee", quantity: 1 },
    { img: "epee-1.png", title: "Épée Tranchante x3", description: "Augmente l'attaque du joueur de 5%.", price: 41, type: "epee", quantity: 3 },
    { img: "epee-1.png", title: "Épée Tranchante x5", description: "Augmente l'attaque du joueur de 5%.", price: 65, type: "epee", quantity: 5 },
    { img: "elixir-1.png", title: "Élixir de Puissance x1", description: "Augmente l'attaque de 50 points.", price: 20, type: "elixir", quantity: 1 },
    { img: "elixir-1.png", title: "Élixir de Puissance x3", description: "Augmente l'attaque de 50 points.", price: 55, type: "elixir", quantity: 3 },
    { img: "elixir-1.png", title: "Élixir de Puissance x5", description: "Augmente l'attaque de 50 points.", price: 87, type: "elixir", quantity: 5 },
    { img: "bouclier.png", title: "Bouclier solide x1", description: "Augmente la défense de 15 points.", price: 13, type: "bouclier", quantity: 1 },
    { img: "bouclier.png", title: "Bouclier solide x3", description: "Augmente la défense de 15 points.", price: 36, type: "bouclier", quantity: 3 },
    { img: "bouclier.png", title: "Bouclier solide x5", description: "Augmente la défense de 15 points.", price: 57, type: "bouclier", quantity: 5 },
    { img: "Cape_de_l'ombre.png", title: "Cape de l'ombre x1", description: "Ignore les dégâts subis par la prochaine attaque directe de l'adversaire.", price: 55, type: "cape", quantity: 1 },
    { img: "Cape_de_l'ombre.png", title: "Cape de l'ombre x3", description: "Ignore les dégâts subis par la prochaine attaque directe de l'adversaire.", price: 152, type: "cape", quantity: 3 },
    { img: "Cape_de_l'ombre.png", title: "Cape de l'ombre x5", description: "Ignore les dégâts subis par la prochaine attaque directe de l'adversaire.", price: 239, type: "cape", quantity: 5 }
  ];
  const randomIndex = App.getRandomInt(App.items.length);
  const item = App.items[randomIndex];
  App.items.splice(randomIndex, 1);
  const discountedPrice = App.applyDiscount(item.price);
  const offerItem = document.createElement('div');
  offerItem.classList.add('bonus-item');
  offerItem.innerHTML = `
      <img src="${item.img}" alt="${item.title}">
      <h2>${item.title}</h2>
      <p>${item.description}</p>
      <p>Prix normal : ${item.price} points</p>
      <p>Prix réduit : ${discountedPrice} points</p>
      <button class="buyButton" data-type="${item.type}" data-price="${discountedPrice}" data-quantity="${item.quantity}">Acheter</button>
      <p class="error-message"></p>
    `;
  dailyCategory.appendChild(offerItem);
  dailyOffers = { date: today, item: { img: item.img, title: item.title, description: item.description, price: item.price, discountedPrice, type: item.type, quantity: item.quantity } };
  localStorage.setItem('dailyOffers', JSON.stringify(dailyOffers));
  saveUserData(JSON.parse(localStorage.getItem('userData')) || {});
  return dailyOffers;
}

App.displayDailyOffers = function() {
  const dailyOffers = JSON.parse(localStorage.getItem('dailyOffers'));
  const dailyCategory = document.getElementById('category-daily');
  if (!dailyOffers) return;
  const today = new Date().toDateString();
  if (dailyOffers.date !== today) {
    App.generateDailyOffers();
    return;
  }
  dailyCategory.innerHTML = '';
  const rewardItem = document.createElement('div');
  rewardItem.classList.add('bonus-item');
  rewardItem.innerHTML = `
      <img src="gratuite-rec.png" alt="Récompense Gratuite">
      <h2>Récompense Gratuite</h2>
      <p>Profitez d'une récompense gratuite aujourd'hui !</p>
      <p>Prix : 0 Points</p>
      <button class="claimButton"${(JSON.parse(localStorage.getItem('userData')) || {}).boutique_recompense ? ' disabled' : ''}>${(JSON.parse(localStorage.getItem('userData')) || {}).boutique_recompense ? 'Déjà pris' : 'Réclamer'}</button>
      <p class="error-message"></p>
    `;
  dailyCategory.appendChild(rewardItem);
  const item = dailyOffers.item;
  const offerItem = document.createElement('div');
  offerItem.classList.add('bonus-item');
  offerItem.innerHTML = `
      <img src="${item.img}" alt="${item.title}">
      <h2>${item.title}</h2>
      <p>${item.description}</p>
      <p>Prix normal : ${item.price} points</p>
      <p>Prix réduit : ${item.discountedPrice} points</p>
      <button class="buyButton" data-type="${item.type}" data-price="${item.discountedPrice}" data-quantity="${item.quantity}">Acheter</button>
      <p class="error-message"></p>
    `;
  dailyCategory.appendChild(offerItem);
  // Ajout des écouteurs d'évènements
  dailyCategory.querySelectorAll('.claimButton').forEach(button => {
    button.addEventListener('click', App.handleClaimButtonClick);
  });
  dailyCategory.querySelectorAll('.buyButton').forEach(button => {
    button.addEventListener('click', App.handleBuyButtonClick);
  });
  document.querySelectorAll('.buyButton').forEach(button => {
    button.addEventListener('click', App.handleBuyButtonClick);
  });

}

/* ===================== AUTRES FONCTIONS ===================== */
App.updateStockDisplay = function() {
  const userData = JSON.parse(localStorage.getItem('userData')) || {};
  document.getElementById('stock-xp').textContent = userData.Double_XP_acheté || 0;
  document.getElementById('stock-potion').textContent = userData.Potion_de_Santé_acheté || 0;
  document.getElementById('stock-amulette').textContent = userData.Amulette_de_Régénération_acheté || 0;
  document.getElementById('stock-epee').textContent = userData.epee_tranchante_acheté || 0;
  document.getElementById('stock-elixir').textContent = userData.elixir_puissance_acheté || 0;
  document.getElementById('stock-armure').textContent = userData.armure_fer_acheté || 0;
  document.getElementById('stock-bouclier').textContent = userData.bouclier_solide_acheté || 0;
  document.getElementById('stock-cape').textContent = userData.Cape_acheté || 0;
  document.getElementById('stock-crystal').textContent = userData.crystal_acheté || 0;
}

App.handleBuyButtonClick = function(event) {
  const button = event.target;
  const type = button.dataset.type;
  const errorMessage = button.nextElementSibling;
  let quantity, prixTotal;

  // Vérifier si le bouton est précédé d'un sélecteur
  const bonusItem = button.closest('.bonus-item');
  const select = bonusItem.querySelector('.quantity-select');

  if (select) {
    // On récupère l'option sélectionnée
    const selectedOption = select.options[select.selectedIndex];
    quantity = parseInt(select.value);
    // On utilise le prix affiché dans l'option (déjà calculé en fonction de la quantité)
    prixTotal = parseInt(selectedOption.getAttribute('data-price'));
  } else {
    // Si pas de sélecteur, c'est une offre pack.
    quantity = parseInt(button.dataset.quantity) || 1;
    const basePrice = parseInt(button.dataset.price);
    // On applique les coefficients pour un pack
    if (quantity === 1) {
      prixTotal = Math.round(basePrice * 0.96);
    } else if (quantity === 3) {
      prixTotal = Math.round(basePrice * 0.92);
    } else if (quantity === 5) {
      prixTotal = Math.round(basePrice * 0.87);
    } else {
      prixTotal = basePrice;
    }
  }

  App.userData = JSON.parse(localStorage.getItem('userData')) || {};
  if (App.userData.argent >= prixTotal) {
    App.userData.argent -= prixTotal;
    if (type === 'xp') {
      App.userData.Double_XP_acheté = (App.userData.Double_XP_acheté || 0) + quantity;
    } else if (type === 'potion') {
      App.userData.Potion_de_Santé_acheté = (App.userData.Potion_de_Santé_acheté || 0) + quantity;
    } else if (type === 'amulette') {
      App.userData.Amulette_de_Régénération_acheté = (App.userData.Amulette_de_Régénération_acheté || 0) + quantity;
    } else if (type === 'epee') {
      App.userData.epee_tranchante_acheté = (App.userData.epee_tranchante_acheté || 0) + quantity;
    } else if (type === 'elixir') {
      App.userData.elixir_puissance_acheté = (App.userData.elixir_puissance_acheté || 0) + quantity;
    } else if (type === 'armure') {
      App.userData.armure_fer_acheté = (App.userData.armure_fer_acheté || 0) + quantity;
    } else if (type === 'bouclier') {
      App.userData.bouclier_solide_acheté = (App.userData.bouclier_solide_acheté || 0) + quantity;
    } else if (type === 'cape') {
      App.userData.Cape_acheté = (App.userData.Cape_acheté || 0) + quantity;
    } else if (type === 'crystal') {
      App.userData.crystal_acheté = (App.userData.crystal_acheté || 0) + quantity;
    }
    saveUserData(App.userData);
    document.getElementById('balance').textContent = "Solde : " + App.userData.argent;
    errorMessage.textContent = '';
    App.updateStockDisplay();
  } else {
    errorMessage.textContent = "Solde insuffisant !";
  }
}



App.handleClaimButtonClick = function(event) {
  const button = event.target;
  button.disabled = true;
  button.textContent = "Déjà pris";
  button.nextElementSibling.textContent = '';
  let userData = JSON.parse(localStorage.getItem('userData')) || {};
  if (!userData.boutique_recompense) {
    userData.recompense = (userData.recompense || 0) + 1;
    userData.boutique_recompense = true;
    saveUserData(userData);
    loadPage('recompenses');
  }
}

  App.userData = JSON.parse(localStorage.getItem('userData')) || {};

App.User = false;
App.userId = null;

firebase.auth().onAuthStateChanged(user => {
  if (user) {
    console.log("Utilisateur authentifié avec UID :", user.uid);
    App.User = true;
    App.userId = user.uid;
    saveUserData(App.userData);
  } else {
    console.log("Aucun utilisateur authentifié");
  }
});

/* ===================== MINUTERIE OFFRES JOURNALIÈRES ===================== */
App.updateDailyTimer = function() {
  const now = new Date();
  const resetHour = 9;
  const nextReset = new Date();
  nextReset.setHours(resetHour, 0, 0, 0);
  if (now > nextReset) {
    nextReset.setDate(nextReset.getDate() + 1);
  }
  const timeLeft = nextReset - now;
  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
  document.getElementById('daily-timer').textContent = `- ${hours}h ${minutes}m ${seconds}s`;
  setTimeout(App.updateDailyTimer, 1000);
}
App.updateDailyTimer();

/* ===================== FONCTION DE RECHERCHE ===================== */
App.searchBar = document.getElementById('search-bar');
App.items = document.querySelectorAll('.bonus-item');
App.searchResults = document.getElementById('search-results');

App.normalizeString = function(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

App.isSimilar = function(str1, str2) {
  let diffCount = 0;
  const maxLen = Math.max(str1.length, str2.length);
  const minLen = Math.min(str1.length, str2.length);
  for (let i = 0; i < minLen; i++) {
    if (str1[i] !== str2[i]) {
      diffCount++;
      if (diffCount > 2) return false;
    }
  }
  return diffCount <= 2 || (maxLen - minLen <= 1);
}

App.similarityScore = function(query, itemName) {
  const normalizedQuery = App.normalizeString(query);
  const normalizedItemName = App.normalizeString(itemName);
  if (normalizedItemName.startsWith(normalizedQuery)) {
    return 3;
  }
  if (normalizedItemName.includes(normalizedQuery)) {
    return 2;
  }
  if (App.isSimilar(normalizedItemName, normalizedQuery)) {
    return 1;
  }
  return 0;
}

App.searchBar.addEventListener('input', function() {
  const query = App.searchBar.value;
  App.searchResults.innerHTML = '';
  if (query) {
    const results = [];
    App.items.forEach(item => {
      const itemName = item.querySelector('h2').textContent;
      const score = App.similarityScore(query, itemName);
      if (score > 0) {
        results.push({ element: item, score });
      }
    });
    results.sort((a, b) => b.score - a.score);
    results.forEach(result => {
      const resultDiv = document.createElement('div');
      resultDiv.textContent = result.element.querySelector('h2').textContent;
      // Utilisation d'un id unique si présent, sinon on peut utiliser d'autres attributs
      const itemId = result.element.id;
      resultDiv.onclick = function() {
        const targetItem = document.getElementById(itemId);
        if (targetItem) {
          targetItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        App.searchBar.value = '';
        App.searchResults.innerHTML = '';
      };
      App.searchResults.appendChild(resultDiv);
    });
  }
});

/* ===================== INITIALISATION ===================== */
// Sauvegarde initiale et affichage
App.generateDailyOffers();
App.displayDailyOffers();
App.updateStockDisplay();
// Ajoutez cet écouteur une seule fois, par exemple à la fin de votre initialisation
document.querySelectorAll('.quantity-select').forEach(select => {
  select.addEventListener('change', function(){
    const selectedOption = select.options[select.selectedIndex];
    const newPrice = selectedOption.getAttribute('data-price');
    const bonusItem = select.closest('.bonus-item');
    const button = bonusItem.querySelector('.buyButton');
    // On stocke le prix affiché dans le bouton (pour l’achat)
    button.dataset.price = newPrice;
  });
});


