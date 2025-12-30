window.App = window.App || {};

// ===================== CONSTANTES ET CONFIGURATION =====================
// Données statiques pour éviter de les recréer dans les fonctions.
App.BONUS_TEXTS = {
  xp_2: { alt: "Double XP Bonus", title: "Double XP", description: "Profitez du double XP lors de vos combats !" },
  potion: { alt: "Potion de Santé", title: "Potion de Santé", description: "Augmente les PV du joueur de 1100." },
  amulette: { alt: "Amulette de Régénération", title: "Amulette de Régénération", description: "Régénère 2% des PV max par tour." },
  epee: { alt: "Épée Tranchante", title: "Épée Tranchante", description: "Augmente l'attaque du joueur de 5%." },
  elixir: { alt: "Élixir de Puissance", title: "Élixir de Puissance", description: "Augmente l'attaque de 50 points." },
  bouclier: { alt: "Bouclier solide", title: "Bouclier solide", description: "Augmente la défense de 15 points." },
  cape: { alt: "Cape de l'ombre", title: "Cape de l'ombre", description: "Ignore les dégâts subis par la prochaine attaque." },
  armure: { alt: "Armure de Fer", title: "Armure de Fer", description: "Réduit les dégâts reçus de 10%." },
  crystal: { alt: "Crystal de renouveau", title: "Crystal de renouveau", description: "Recharge 0.8 points de la capacité spéciale." }
};

// Map pour lier le type d'item à la propriété correspondante dans userData
App.ITEM_PROPERTY_MAP = {
    xp: 'Double_XP_acheté',
    potion: 'Potion_de_Santé_acheté',
    amulette: 'Amulette_de_Régénération_acheté',
    epee: 'epee_tranchante_acheté',
    elixir: 'elixir_puissance_acheté',
    armure: 'armure_fer_acheté',
    bouclier: 'bouclier_solide_acheté',
    cape: 'Cape_acheté',
    crystal: 'crystal_acheté',
    marque_chasseur: 'marque_chasseur_acheté',
    purge_spirituelle: 'purge_spirituelle_acheté',
    orbe_siphon: 'orbe_siphon_acheté'
};

// Cache pour les données utilisateur afin de limiter les accès au localStorage
App.userData = JSON.parse(localStorage.getItem('userData')) || {};

// ===================== NAVIGATION =====================
App.viewCharacters = function() {
  clearTimeout(App.dailyTimerId);
  loadPage("perso_stats");
};
App.goToPasse = function() {
  clearTimeout(App.dailyTimerId);
  loadPage("passe_de_combat");
};
App.showMainMenu = function() {
  clearTimeout(App.dailyTimerId);
  loadPage("menu_principal");
};

// ===================== FONCTIONS UTILITAIRES =====================
App.getRandomInt = (max) => Math.floor(Math.random() * max);
App.applyDiscount = (price) => Math.round(price * 0.8); // 20% de réduction

// Fonction pour créer le HTML d'un item, évite la duplication de code
function createItemHTML(item) {
    const discountedPrice = item.discountedPrice !== undefined ? item.discountedPrice : App.applyDiscount(item.price);
    const priceHTML = item.discountedPrice !== undefined
        ? `<p>Prix normal : ${item.price} points</p><p>Prix réduit : ${discountedPrice} points</p>`
        : `<p>Prix : ${item.price} Points</p>`;

    return `
        <img src="${item.img}" alt="${item.title}">
        <h2>${item.title}</h2>
        <p>${item.description}</p>
        ${priceHTML}
        <button class="buyButton" data-type="${item.type}" data-price="${discountedPrice}" data-quantity="${item.quantity}">Acheter</button>
        <p class="error-message"></p>
    `;
}

// ===================== MISE À JOUR DE L'INTERFACE (DOM) =====================
App.updateStaticTexts = function() {
    document.querySelectorAll('.stock-label').forEach(el => el.textContent = "En stock : ");
    document.getElementById('balance').textContent = `Solde : ${App.userData.argent || 0}`;
    document.getElementById('search-bar').placeholder = "Rechercher un objet";
    document.getElementById('dailyoffers').textContent = "Offres Journalières";

    const content = document.querySelector('.content');
    if (content) {
        content.querySelector('h1').textContent = "Bienvenue dans la Boutique de Jeux";
        document.getElementById('xptitle').textContent = "Catégorie XP";
        document.getElementById('soinstitle').textContent = "Catégorie Soins";
        document.getElementById('attaquetitle').textContent = "Catégorie Attaque";
        document.getElementById('defensetitle').textContent = "Catégorie Défense";
        document.getElementById('autretitle').textContent = "Catégorie Autre";
    }

    // Mise à jour groupée des bonus
    Object.keys(App.BONUS_TEXTS).forEach(key => {
        const el = document.getElementById(key.replace('_', '-'));
        if (el) {
            const texts = App.BONUS_TEXTS[key];
            el.querySelector('img').alt = texts.alt;
            el.querySelector('h2').textContent = texts.title;
            const p = el.querySelector('p');
            if (p) p.textContent = texts.description;
        }
    });

    const footerImgs = document.querySelectorAll('.footer img');
    if (footerImgs.length >= 4) {
        footerImgs[0].alt = "Personnages";
        footerImgs[1].alt = "Menu Principal";
        footerImgs[2].alt = "Passe de combat";
        footerImgs[3].alt = "Boutique";
    }

    document.querySelectorAll('.bonus-item .buyButton').forEach(button => button.textContent = "Acheter");
};

App.updateStockDisplay = function() {
    for (const type in App.ITEM_PROPERTY_MAP) {
        const elementId = `stock-${type}`;
        const el = document.getElementById(elementId);
        if (el) {
            el.textContent = App.userData[App.ITEM_PROPERTY_MAP[type]] || 0;
        }
    }
};

App.updateEquipmentButtonsState = function() {
    const ownedEquipments = App.userData.equipments || [];
    document.querySelectorAll('.buyButton[data-type="equipment"]').forEach(button => {
        if (ownedEquipments.includes(button.dataset.id)) {
            button.textContent = 'Possédé';
            button.disabled = true;
        }
    });
};

App.updateWeeklyLootboxButtonState = function() {
    const button = document.getElementById('claim-daily-lootbox');
    if (!button) return;

    const currentCycle = App.getParisCycleId('weekly');
    if (App.userData.weekly_chest_claim_id === currentCycle) {
        button.disabled = true;
        button.textContent = "Déjà pris";
    } else {
        button.disabled = false;
        button.textContent = "Réclamer";
    }
};

// ===================== OFFRE SPÉCIALE HEBDOMADAIRE =====================
App.generateSpecialWeeklyOffer = function() {
    const today = new Date();
    const currentThursday = new Date();
    currentThursday.setDate(today.getDate() - (today.getDay() + 3) % 7); // Le jeudi de cette semaine
    currentThursday.setHours(0, 0, 0, 0);

    let specialOffer = JSON.parse(localStorage.getItem('specialWeeklyOffer')) || {};

    if (specialOffer.date !== currentThursday.toDateString()) {
        const lootboxTypes = ['Attaque', 'Défense', 'Agilité', 'Équilibre'];
        const randomType = lootboxTypes[App.getRandomInt(lootboxTypes.length)];
        let discount = App.getRandomInt(31) + 5; // Entre 5 et 35%
        if (App.getRandomInt(100) < 5) { // 5% de chance d'avoir 70%
            discount = 70;
        }
        const originalPrice = 1000;
        const discountedPrice = Math.round(originalPrice * (1 - discount / 100));

        specialOffer = {
            date: currentThursday.toDateString(),
            type: randomType,
            discount: discount,
            originalPrice: originalPrice,
            discountedPrice: discountedPrice,
            purchasesLeft: 3 // Peut être acheté 3 fois
        };
        localStorage.setItem('specialWeeklyOffer', JSON.stringify(specialOffer));
        // Réinitialiser les achats de l'utilisateur pour cette offre
        App.userData.special_weekly_offer_purchases = 0;
        saveUserData(App.userData);
    }
    return specialOffer;
};

App.displaySpecialWeeklyOffer = function(userData) {
  const specialOffer = App.specialWeeklyOffer;
  if (!specialOffer) return;

  const container = document.getElementById('special-weekly-offer');
  if (!container) return;

  // Normalisation du type pour le nom du fichier (suppression des accents pour éviter les 404)
  const normalizedType = specialOffer.type.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").substring(0, 3);

  container.innerHTML = `
    <div class="weekly-offer-card">
      <div class="weekly-offer-title">Offre Spéciale de la Semaine</div>
      <img src="coffre_${normalizedType}.png" alt="Coffre ${specialOffer.type} en promotion">
      <div class="weekly-offer-details">
        <span>1x Coffre ${specialOffer.type}</span>
        <span class="weekly-offer-price">${specialOffer.price} Crystaux</span>
      </div>
      <button class="buy-button" onclick="App.buySpecialWeeklyOffer()">Acheter</button>
    </div>
  `;
};

App.handleBuySpecialLootbox = function(button) {
    const price = parseInt(button.dataset.price, 10);
    const errorMessage = button.nextElementSibling;
    errorMessage.textContent = '';

    if (App.userData.argent >= price) {
        let specialOffer = JSON.parse(localStorage.getItem('specialWeeklyOffer'));
        if (!specialOffer) {
            errorMessage.textContent = "Offre non disponible.";
            return;
        }

        App.userData.special_weekly_offer_purchases = (App.userData.special_weekly_offer_purchases || 0) + 1;

        if (App.userData.special_weekly_offer_purchases <= 3) {
            App.userData.argent -= price;
            const lootboxType = button.dataset.lootboxType;
            let boxesToOpen = JSON.parse(sessionStorage.getItem('boxesToOpen')) || [];
            boxesToOpen.push(lootboxType);
            sessionStorage.setItem('boxesToOpen', JSON.stringify(boxesToOpen));
            sessionStorage.setItem('boughtFromShop', 'true');
            saveUserData(App.userData);
            loadPage('ouverture_coffre');
        } else {
            errorMessage.textContent = "Vous avez atteint la limite d'achat pour cette offre.";
            button.disabled = true;
            button.textContent = "Épuisé";
        }
    } else {
        errorMessage.textContent = "Solde insuffisant !";
    }
};

// ===================== OFFRES JOURNALIÈRES (SERVEUR) =====================
App.fetchDailyOffers = async function() {
    const user = firebase.auth().currentUser;
    if (!user) return null;

    try {
        const token = await user.getIdToken();
        const response = await fetch('/api/shop/daily-offer', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
            localStorage.setItem('dailyOffers', JSON.stringify(data.offer));
            return data.offer;
        }
    } catch (e) {
        console.error("Erreur fetch offres:", e);
    }
    return null;
};

App.displayDailyOffers = async function() {
    let dailyOffers = JSON.parse(localStorage.getItem('dailyOffers'));
    const today = App.getParisCycleId('daily'); // Use same cycle ID as server

    if (!dailyOffers || dailyOffers.date !== today) {
        dailyOffers = await App.fetchDailyOffers();
        if (!dailyOffers) return;
    }

    const dailyCategory = document.getElementById('category-daily');
    if (!dailyCategory) return;

    dailyCategory.innerHTML = '';

    // Récompense gratuite
    const rewardItem = document.createElement('div');
    rewardItem.classList.add('bonus-item');
    
    const isClaimed = (App.userData.daily_reward_claim_id === today);

    rewardItem.innerHTML = `
        <img src="gratuite-rec.png" alt="Récompense Gratuite">
        <h2>Récompense Gratuite</h2>
        <p>Profitez d'une récompense gratuite aujourd'hui !</p>
        <p>Prix : 0 Points</p>
        <button class="claimButton"${isClaimed ? ' disabled' : ''}>${isClaimed ? 'Déjà pris' : 'Réclamer'}</button>
        <p class="error-message"></p>
    `;
    dailyCategory.appendChild(rewardItem);

    // Offre du jour
    const offerItem = document.createElement('div');
    offerItem.classList.add('bonus-item');
    offerItem.innerHTML = createItemHTML(dailyOffers.item);
    dailyCategory.appendChild(offerItem);
};

// ===================== GESTIONNAIRES D'ÉVÉNEMENTS (HANDLERS) =====================
App.handleBuyButtonClick = function(button) {
    const type = button.dataset.type;
    const errorMessage = button.nextElementSibling;
    errorMessage.textContent = ''; // Reset error message

    if (type === 'lootbox') {
        const price = parseInt(button.dataset.price, 10);
        if (App.userData.argent >= price) {
            App.userData.argent -= price;
            const lootboxType = button.dataset.lootboxType;
            let boxesToOpen = JSON.parse(sessionStorage.getItem('boxesToOpen')) || [];
            boxesToOpen.push(lootboxType);
            sessionStorage.setItem('boxesToOpen', JSON.stringify(boxesToOpen));
            sessionStorage.setItem('boughtFromShop', 'true');
            saveUserData(App.userData);
            loadPage('ouverture_coffre');
        } else {
            errorMessage.textContent = "Solde insuffisant !";
        }
    } else if (type === 'special-lootbox') {
        App.handleBuySpecialLootbox(button);
    } else {
        // --- AUTHORITATIVE SERVER BUY (Equipments & Consumables) ---
        const user = firebase.auth().currentUser;
        if (!user) { errorMessage.textContent = "Non connecté"; return; }

        let payload = { userId: user.uid, type: type };
        
        if (type === 'equipment') {
            payload.itemId = button.dataset.id;
            payload.price = parseInt(button.dataset.price, 10);
        } else {
            const bonusItem = button.closest('.bonus-item');
            const select = bonusItem.querySelector('.quantity-select');
            if (select) {
                const selectedOption = select.options[select.selectedIndex];
                payload.quantity = parseInt(selectedOption.textContent, 10);
                payload.price = parseInt(selectedOption.getAttribute('data-price'), 10);
            } else {
                payload.quantity = parseInt(button.dataset.quantity, 10) || 1;
                payload.price = parseInt(button.dataset.price, 10);
            }
        }

        App.getRecaptchaToken('shop_buy').then(recaptchaToken => {
            payload.recaptchaToken = recaptchaToken;
            user.getIdToken().then(token => {
                fetch('/api/shop/buy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(payload)
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        App.userData = data.userData;
                        document.getElementById('balance').textContent = `Solde : ${App.userData.argent}`;
                        saveUserData(App.userData);
                        
                        if (type === 'equipment') {
                            button.textContent = 'Possédé';
                            button.disabled = true;
                        } else {
                            App.updateStockDisplay();
                        }
                    } else {
                        errorMessage.textContent = data.error || "Erreur lors de l'achat";
                    }
                })
                .catch(err => {
                    errorMessage.textContent = "Erreur réseau";
                });
            });
        });
    }
};

App.handleClaimButtonClick = function(button) {
    const user = firebase.auth().currentUser;
    if (!user) { alert("Veuillez vous connecter"); return; }

    const currentDailyCycle = App.getParisCycleId('daily');
    if (App.userData.daily_reward_claim_id !== currentDailyCycle) {
        button.disabled = true; // Optimistic disable
        App.getRecaptchaToken('shop_claim_daily').then(recaptchaToken => {
            user.getIdToken().then(token => {
                fetch('/api/shop/claim-daily', {
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
                    if (data.success) {
                        App.userData = data.userData;
                        saveUserData(App.userData);
                        button.disabled = true;
                        button.textContent = "Déjà pris";
                        loadPage('recompenses');
                    } else {
                        alert(data.error || "Erreur lors de la récupération");
                        button.disabled = false;
                    }
                });
            });
        });
    }
};

App.handleClaimWeeklyLootboxButtonClick = function(button) {
    const user = firebase.auth().currentUser;
    if (!user) { alert("Veuillez vous connecter"); return; }

    button.disabled = true;
    
    App.getRecaptchaToken('shop_claim_weekly').then(recaptchaToken => {
        user.getIdToken().then(token => {
            fetch('/api/shop/claim-weekly', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ userId: user.uid, recaptchaToken })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    App.userData = data.userData;
                    saveUserData(App.userData);
                    
                    let boxesToOpen = JSON.parse(sessionStorage.getItem('boxesToOpen')) || [];
                    boxesToOpen.push(data.boxType);
                    sessionStorage.setItem('boxesToOpen', JSON.stringify(boxesToOpen));
                    
                    button.textContent = "Déjà pris";
                    loadPage('ouverture_coffre');
                } else {
                    alert(data.error || "Impossible de récupérer le coffre");
                    if (data.error !== "Déjà récupéré cette semaine (Reviens Jeudi à 9h00 Paris)") {
                         button.disabled = false;
                    } else {
                         button.textContent = "Déjà pris";
                    }
                }
            })
            .catch(e => {
                console.error(e);
                button.disabled = false;
            });
        });
    });
};

App.handleQuantityChange = function(select) {
    const selectedOption = select.options[select.selectedIndex];
    const newPrice = selectedOption.getAttribute('data-price');
    const button = select.closest('.bonus-item').querySelector('.buyButton');
    button.dataset.price = newPrice;
};

// ===================== MINUTERIES =====================
App.getParisDate = function() {
    const now = new Date();
    const options = { timeZone: 'Europe/Paris', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false };
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(now);
    const get = (t) => parseInt(parts.find(p => p.type === t).value, 10);
    return new Date(Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')));
};

App.getParisCycleId = function(type) {
    const nowParis = App.getParisDate();
    // Shift -9h
    nowParis.setUTCHours(nowParis.getUTCHours() - 9);
    
    if (type === 'daily') {
        return nowParis.toISOString().split('T')[0];
    } else {
         const day = nowParis.getUTCDay(); // 0-6
         const diff = (day - 4 + 7) % 7;
         nowParis.setUTCDate(nowParis.getUTCDate() - diff);
         return nowParis.toISOString().split('T')[0];
    }
};

App.updateDailyTimer = function() {
    const timerElement = document.getElementById('daily-timer');
    if (!timerElement) {
        clearTimeout(App.dailyTimerId);
        return;
    }
    const nowParis = App.getParisDate();
    let nextReset = new Date(nowParis);
    nextReset.setUTCHours(9, 0, 0, 0);
    
    if (nowParis >= nextReset) nextReset.setUTCDate(nextReset.getUTCDate() + 1);

    const timeLeft = nextReset - nowParis;
    const hours = Math.floor(timeLeft / 3600000);
    const minutes = Math.floor((timeLeft % 3600000) / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    timerElement.textContent = `- ${hours}h ${minutes}m ${seconds}s`;
    App.dailyTimerId = setTimeout(App.updateDailyTimer, 1000);
};

App.updateWeeklyTimer = function() {
    const timerElement = document.getElementById('weekly-timer');
    if (!timerElement) {
        if (App.weeklyTimerId) clearTimeout(App.weeklyTimerId);
        return;
    }
    const nowParis = App.getParisDate();
    
    // Target: Next Thursday 09:00:00 Paris
    // Day 0=Sun, 4=Thu.
    let target = new Date(nowParis);
    target.setUTCHours(9, 0, 0, 0);
    
    const day = target.getUTCDay();
    const diff = (4 - day + 7) % 7;
    
    if (diff === 0 && nowParis < target) {
        // It is Thursday, before 9AM -> Target is today 9AM
    } else {
        let addDays = diff;
        if (diff === 0 && nowParis >= target) addDays = 7;
        target.setUTCDate(target.getUTCDate() + addDays);
    }

    const timeLeft = target - nowParis;
    const days = Math.floor(timeLeft / 86400000);
    const hours = Math.floor((timeLeft % 86400000) / 3600000);
    const minutes = Math.floor((timeLeft % 3600000) / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    timerElement.textContent = `Prochain coffre dans : ${days}j ${hours}h ${minutes}m ${seconds}s`;
    App.weeklyTimerId = setTimeout(App.updateWeeklyTimer, 1000);
};

App.updateSpecialWeeklyOfferTimer = function() {
    const timerElement = document.getElementById('special-weekly-offer-timer');
    if (!timerElement) {
        if (App.specialWeeklyOfferTimerId) clearTimeout(App.specialWeeklyOfferTimerId);
        return;
    }

    const now = new Date();
    const nextThursday = new Date();
    nextThursday.setDate(now.getDate() + (11 - now.getDay()) % 7); // Prochain jeudi
    nextThursday.setHours(0, 0, 0, 0); // À minuit

    const timeLeft = nextThursday - now;
    const days = Math.floor(timeLeft / 86400000);
    const hours = Math.floor((timeLeft % 86400000) / 3600000);
    const minutes = Math.floor((timeLeft % 3600000) / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);

    timerElement.textContent = `Fin de l'offre dans : ${days}j ${hours}h ${minutes}m ${seconds}s`;
    App.specialWeeklyOfferTimerId = setTimeout(App.updateSpecialWeeklyOfferTimer, 1000);
};

// ===================== RECHERCHE =====================
App.normalizeString = (str) => str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

App.similarityScore = function(query, itemName) {
    const normalizedQuery = App.normalizeString(query);
    const normalizedItemName = App.normalizeString(itemName);
    if (normalizedItemName.startsWith(normalizedQuery)) return 3;
    if (normalizedItemName.includes(normalizedQuery)) return 2;
    // isSimilar logic can be simplified or kept as is if it works well
    const minLen = Math.min(normalizedItemName.length, normalizedQuery.length);
    let diff = Math.abs(normalizedItemName.length - normalizedQuery.length);
    for (let i = 0; i < minLen; i++) {
        if (normalizedItemName[i] !== normalizedQuery[i]) diff++;
    }
    return diff <= 2 ? 1 : 0;
};

App.handleSearch = function(searchBar) {
    const query = searchBar.value;
    const searchResults = document.getElementById('search-results');
    searchResults.innerHTML = '';
    if (query) {
        const allItems = document.querySelectorAll('.bonus-item');
        const results = [];
        allItems.forEach(item => {
            const itemName = item.querySelector('h2').textContent;
            const score = App.similarityScore(query, itemName);
            if (score > 0) {
                results.push({ element: item, score });
            }
        });

        results.sort((a, b) => b.score - a.score);
        const fragment = document.createDocumentFragment();
        results.forEach(result => {
            const resultDiv = document.createElement('div');
            resultDiv.textContent = result.element.querySelector('h2').textContent;
            resultDiv.onclick = () => {
                result.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                searchBar.value = '';
                searchResults.innerHTML = '';
            };
            fragment.appendChild(resultDiv);
        });
        searchResults.appendChild(fragment);
    }
};

// ===================== GESTION DES ONGLETS =====================
App.switchTab = (activeTab) => {
    if (!activeTab) return;
    const activeContentId = activeTab.getAttribute('data-tab');
    document.querySelectorAll('.tab-link').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    activeTab.classList.add('active');
    const activeContent = document.getElementById(activeContentId);
    if (activeContent) activeContent.classList.add('active');
};

// ===================== DÉLÉGATION D'ÉVÉNEMENTS =====================
// Un seul écouteur pour tous les clics et changements, beaucoup plus performant.
// On vérifie si les écouteurs ont déjà été attachés pour éviter les duplications
// lors de la navigation sans rechargement de page.
if (!App.shopListenersAttached) {
    document.addEventListener('click', function(event) {
        const buyButton = event.target.closest('.buyButton');
        if (buyButton) {
            event.preventDefault();
            App.handleBuyButtonClick(buyButton);
            return;
        }

        const claimButton = event.target.closest('.claimButton');
        if (claimButton) {
            event.preventDefault();
            App.handleClaimButtonClick(claimButton);
            return;
        }
        
        const weeklyClaimButton = event.target.closest('#claim-daily-lootbox');
        if (weeklyClaimButton) {
            event.preventDefault();
            App.handleClaimWeeklyLootboxButtonClick(weeklyClaimButton);
            return;
        }

        const tab = event.target.closest('.tab-link');
        if (tab) {
            event.preventDefault();
            App.switchTab(tab);
            return;
        }
    });

    document.addEventListener('change', function(event) {
        const quantitySelect = event.target.closest('.quantity-select');
        if (quantitySelect) {
            App.handleQuantityChange(quantitySelect);
        }
    });

    document.addEventListener('input', function(event) {
        const searchBar = event.target.closest('#search-bar');
        if (searchBar) {
            App.handleSearch(searchBar);
        }
    });

    App.shopListenersAttached = true;
}

// ===================== INITIALISATION =====================
function initializeShop() {
    App.updateStaticTexts();
    // App.generateDailyOffers() removed (now handled by displayDailyOffers via server)
    App.displayDailyOffers();
    App.displaySpecialWeeklyOffer(); // Afficher l'offre spéciale hebdomadaire
    App.updateStockDisplay();
    App.updateEquipmentButtonsState();
    App.updateWeeklyLootboxButtonState();
    App.updateWeeklyTimer();
    App.updateDailyTimer();
    App.updateSpecialWeeklyOfferTimer(); // Démarrer le minuteur de l'offre spéciale

    // Gérer l'onglet initial et la redirection
    const shopSection = sessionStorage.getItem('shopSection');
    if (shopSection === 'equipments') {
        const equipmentsTab = document.querySelector('[data-tab="equipment-content"]');
        App.switchTab(equipmentsTab);
        sessionStorage.removeItem('shopSection');
    } else {
        const initialTab = document.querySelector('.tab-link.active');
        App.switchTab(initialTab);
    }
}

// Lancer l'initialisation une fois que le DOM est prêt
// (dans un projet moderne, on utiliserait DOMContentLoaded, mais c'est plus sûr ainsi)
initializeShop();

window.addEventListener('unload', function() {
    if (App.dailyTimerId) clearTimeout(App.dailyTimerId);
    if (App.weeklyTimerId) clearTimeout(App.weeklyTimerId);
    if (App.specialWeeklyOfferTimerId) clearTimeout(App.specialWeeklyOfferTimerId);
});

