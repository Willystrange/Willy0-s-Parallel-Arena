window.App = window.App || {};

// ===================== CONSTANTES ET CONFIGURATION =====================
// Données statiques pour éviter de les recréer dans les fonctions.
App.BONUS_TEXTS = {
  xp_2: { alt: "Double XP Bonus", titleKey: "shop.items.xp_2.title", descriptionKey: "shop.items.xp_2.desc" },
  potion: { alt: "Potion de Santé", titleKey: "shop.items.potion.title", descriptionKey: "shop.items.potion.desc" },
  amulette: { alt: "Amulette de Régénération", titleKey: "shop.items.amulette.title", descriptionKey: "shop.items.amulette.desc" },
  epee: { alt: "Épée Tranchante", titleKey: "shop.items.epee.title", descriptionKey: "shop.items.epee.desc" },
  elixir: { alt: "Élixir de Puissance", titleKey: "shop.items.elixir.title", descriptionKey: "shop.items.elixir.desc" },
  bouclier: { alt: "Bouclier solide", titleKey: "shop.items.bouclier.title", descriptionKey: "shop.items.bouclier.desc" },
  cape: { alt: "Cape de l'ombre", titleKey: "shop.items.cape.title", descriptionKey: "shop.items.cape.desc" },
  armure: { alt: "Armure de Fer", titleKey: "shop.items.armure.title", descriptionKey: "shop.items.armure.desc" },
  crystal: { alt: "Crystal de renouveau", titleKey: "shop.items.crystal.title", descriptionKey: "shop.items.crystal.desc" },
  marque_chasseur: { alt: "Marque de Chasseur", titleKey: "shop.items.marque_chasseur.title", descriptionKey: "shop.items.marque_chasseur.desc" },
  purge_spirituelle: { alt: "Purge Spirituelle", titleKey: "shop.items.purge_spirituelle.title", descriptionKey: "shop.items.purge_spirituelle.desc" },
  orbe_siphon: { alt: "Orbe de Siphon", titleKey: "shop.items.orbe_siphon.title", descriptionKey: "shop.items.orbe_siphon.desc" }
};

// Map pour lier le type d'item à la propriété correspondante dans userData
App.ITEM_PROPERTY_MAP = {
    xp: 'Double_XP',
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
    let title = item.title;
    let description = item.description;

    // Tentative de traduction basée sur le type si disponible dans BONUS_TEXTS
    let typeKey = item.type;
    if (typeKey === 'xp') typeKey = 'xp_2'; // Alias pour le Double XP

    if (typeKey && App.BONUS_TEXTS[typeKey]) {
        // On récupère le titre de base (ex: "Double XP")
        let baseTitle = App.t(App.BONUS_TEXTS[typeKey].titleKey);
        
        // Si l'item a une quantité > 1, on l'ajoute au titre traduit
        if (item.quantity && item.quantity > 1) {
            title = `${baseTitle} x${item.quantity}`;
        } else {
            title = baseTitle;
        }
        
        description = App.t(App.BONUS_TEXTS[typeKey].descriptionKey);
    } 

    const discountedPrice = item.discountedPrice !== undefined ? item.discountedPrice : App.applyDiscount(item.price);
    const priceHTML = item.discountedPrice !== undefined
        ? `<p>${App.t("shop.labels.normal_price", {price: item.price})}</p><p>${App.t("shop.labels.discounted_price", {price: discountedPrice})}</p>`
        : `<p>${App.t("shop.labels.price", {price: item.price})}</p>`;

    return `
        <img src="${item.img}" alt="${title}">
        <h2><span>${title}</span></h2>
        <p>${description}</p>
        ${priceHTML}
        <button class="buyButton" data-type="${item.type}" data-price="${discountedPrice}" data-quantity="${item.quantity}">${App.t("shop.buttons.buy")}</button>
        <p class="error-message"></p>
    `;
}

// ===================== MISE À JOUR DE L'INTERFACE (DOM) =====================
App.updateStaticTexts = function() {
    App.translatePage(); // Utilise le système de traduction global

    document.querySelectorAll('.stock-label').forEach(el => el.textContent = App.t("shop.labels.stock"));
    document.getElementById('balance').textContent = App.t("shop.balance", {amount: App.userData.argent || 0});
    
    // Les titres et placeholders sont gérés par data-i18n dans App.translatePage()
    // Mais on peut forcer la mise à jour ici si besoin pour le contenu dynamique non couvert par data-i18n

    // Mise à jour groupée des bonus
    Object.keys(App.BONUS_TEXTS).forEach(key => {
        const el = document.getElementById(key.replace('_', '-'));
        if (el) {
            const texts = App.BONUS_TEXTS[key];
            const titleEl = el.querySelector('h2');
            const pEl = el.querySelector('p:nth-of-type(1)'); // Description est le premier p
            
            if (titleEl) {
                const span = titleEl.querySelector('span');
                if (span && !span.hasAttribute('data-i18n')) {
                    span.textContent = App.t(texts.titleKey);
                } else if (!span && !titleEl.hasAttribute('data-i18n')) {
                    // Fallback si pas de span (ne devrait pas arriver avec le nouveau HTML)
                     titleEl.textContent = App.t(texts.titleKey);
                }
            }
            if (pEl && !pEl.hasAttribute('data-i18n')) pEl.textContent = App.t(texts.descriptionKey);
        }
    });

    const footerImgs = document.querySelectorAll('.footer img');
    if (footerImgs.length >= 4) {
        // footerImgs[0].alt = "Personnages";
        // footerImgs[1].alt = "Menu Principal";
        // footerImgs[2].alt = "Passe de combat";
        // footerImgs[3].alt = "Boutique";
    }

    // Update 'Acheter' buttons just in case
    document.querySelectorAll('.bonus-item .buyButton').forEach(button => {
        if (!button.disabled && button.textContent === "Acheter") { // Avoid overwriting 'Possédé' or 'Épuisé'
             button.textContent = App.t("shop.buttons.buy");
        }
    });
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
            button.textContent = App.t('shop.buttons.owned');
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
        button.textContent = App.t('shop.buttons.claimed');
    } else {
        button.disabled = false;
        button.textContent = App.t('shop.buttons.claim');
    }
};

// ===================== OFFRE SPÉCIALE HEBDOMADAIRE =====================
App.generateSpecialWeeklyOffer = function() {
    // Cette fonction semble générer localement l'offre si elle n'existe pas,
    // mais idéalement cela devrait venir du serveur pour être synchrone pour tout le monde.
    // Pour l'instant on garde la logique existante.
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
  // console.log("DEBUG: Calling displaySpecialWeeklyOffer");
  let specialOffer = App.specialWeeklyOffer; // Note: defined where? Assuming global or passed
  // Fallback to local generation if not present (logic from previous version)
  if (!specialOffer) {
       // Logic moved to initialization potentially, but let's check localStorage
       const stored = JSON.parse(localStorage.getItem('specialWeeklyOffer'));
       if (stored) App.specialWeeklyOffer = stored;
       else App.specialWeeklyOffer = App.generateSpecialWeeklyOffer();
       specialOffer = App.specialWeeklyOffer;
  }
  
  // console.log("DEBUG: specialOffer object:", specialOffer);

  if (!specialOffer) {
      console.warn("DEBUG: No special offer available to display.");
      return;
  }

    const container = document.getElementById('category-special-weekly-offer');

    // console.log("DEBUG: Container found:", container);

    

    if (!container) return;

  

    // Normalisation du type pour le nom du fichier et la traduction

    const typeMap = {

        'Attack': 'Attaque', 'Defense': 'Défense', 'Agility': 'Agilité', 'Balance': 'Équilibre',

        'Attaque': 'Attaque', 'Défense': 'Défense', 'Agilité': 'Agilité', 'Équilibre': 'Équilibre'

    };

    const normalizedTypeBase = typeMap[specialOffer.type] || specialOffer.type;

    const normalizedType = normalizedTypeBase.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").substring(0, 3);

    

    const typeKeyMap = {

        'Attaque': 'chest_attack',

        'Défense': 'chest_defense',

        'Agilité': 'chest_agility',

        'Équilibre': 'chest_balance'

    };

    

    // Construction des données pour createItemHTML

    const itemData = {

        img: `coffre_${normalizedType}.png`,

        title: specialOffer.type, // Sera écrasé par la traduction si la clé est trouvée

        description: "", // Idem

        price: specialOffer.originalPrice,

        discountedPrice: specialOffer.discountedPrice,

        type: 'special-lootbox',

        quantity: 1

    };

  

    // Récupération des textes traduits

    if (typeKeyMap[normalizedTypeBase]) {

        itemData.title = App.t(`shop.items.${typeKeyMap[normalizedTypeBase]}.title`);

        itemData.description = App.t(`shop.items.${typeKeyMap[normalizedTypeBase]}.desc`);

    }

  

    // Création de l'élément DOM

    const offerItem = document.createElement('div');

    offerItem.classList.add('bonus-item');

    offerItem.innerHTML = createItemHTML(itemData);

  

    // Ajout de l'attribut spécifique manquant pour le handler

    const btn = offerItem.querySelector('.buyButton');

    if (btn) {

        btn.dataset.lootboxType = specialOffer.type;

        

        // Gestion de l'état "Epuisé" si nécessaire

        if (specialOffer.purchasesLeft !== undefined) {

           // Si on voulait gérer l'affichage du stock restant, on pourrait le faire ici.

           // Mais le système actuel utilise App.userData.special_weekly_offer_purchases côté logique d'achat.

           // Pour l'affichage initial, on peut vérifier si max atteint.

           if (App.userData.special_weekly_offer_purchases >= 3) {

               btn.disabled = true;

               btn.textContent = App.t("shop.buttons.exhausted");

           }

        }

    }

  

      container.innerHTML = '';

  

      container.appendChild(offerItem);

  

      

  

      setTimeout(App.checkTitleOverflow, 50);

  

    };

  

    

  

    // Missing buySpecialWeeklyOffer function wrapper? 
// The original code had App.handleBuySpecialLootbox called from handleBuyButtonClick, 
// but the HTML in displaySpecialWeeklyOffer calls App.buySpecialWeeklyOffer() directly? 
// The previous file content showed `onclick="App.buySpecialWeeklyOffer()"` in the injected HTML string, 
// but didn't define `App.buySpecialWeeklyOffer`.
// It seems `App.handleBuySpecialLootbox` deals with it. 
// I will map `App.buySpecialWeeklyOffer` to trigger the buy logic.

App.handleBuySpecialLootbox = function(button) {
    const price = parseInt(button.dataset.price, 10);
    const errorMessage = button.nextElementSibling;
    errorMessage.textContent = '';

    if (App.userData.argent >= price) {
        let specialOffer = JSON.parse(localStorage.getItem('specialWeeklyOffer'));
        if (!specialOffer) {
            errorMessage.textContent = App.t("shop.errors.unavailable");
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
            errorMessage.textContent = App.t("shop.errors.limit_reached");
            button.disabled = true;
            button.textContent = App.t("shop.buttons.exhausted");
        }
    } else {
        errorMessage.textContent = App.t("shop.errors.insufficient_funds");
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
        <h2><span>${App.t("shop.items.daily_reward.title")}</span></h2>
        <p>${App.t("shop.items.daily_reward.desc")}</p>
        <p>${App.t("shop.labels.price", {price: 0})}</p>
        <button class="claimButton"${isClaimed ? ' disabled' : ''}>${isClaimed ? App.t("shop.buttons.claimed") : App.t("shop.buttons.claim")}</button>
        <p class="error-message"></p>
    `;
    dailyCategory.appendChild(rewardItem);

    // Offre du jour
    // Need to translate dynamic item if possible. 
    // Assuming 'item' has title/desc which are keys or static strings? 
    // The server returns item object. If it matches one of standard items, we can translate title/desc.
    // For now, let's use the object returned by server but try to translate title if it matches a key.
    
    // Server returns constructed object. Ideally server sends ID and we reconstruct or server sends keys.
    // Assuming server sends text. We'll use it as is for now or improve later.
    const offerItem = document.createElement('div');
    offerItem.classList.add('bonus-item');
    
    // Override description/title if they match standard items
    let item = dailyOffers.item;
    // Basic translation attempt if title matches
    // (This part depends on what server sends. If it sends French text, we can't easily translate back without mapping)
    
    offerItem.innerHTML = createItemHTML(item);
    dailyCategory.appendChild(offerItem);
    
    setTimeout(App.checkTitleOverflow, 50);
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
            errorMessage.textContent = App.t("shop.errors.insufficient_funds");
        }
    } else if (type === 'special-lootbox') {
        App.handleBuySpecialLootbox(button);
    } else {
        // --- AUTHORITATIVE SERVER BUY (Equipments & Consumables) ---
        const user = firebase.auth().currentUser;
        if (!user) { errorMessage.textContent = App.t("shop.errors.not_connected"); return; }

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
                        document.getElementById('balance').textContent = App.t("shop.balance", {amount: App.userData.argent});
                        saveUserData(App.userData);
                        
                        if (type === 'equipment') {
                            button.textContent = App.t("shop.buttons.owned");
                            button.disabled = true;
                        } else {
                            App.updateStockDisplay();
                        }
                    } else {
                        errorMessage.textContent = data.error || "Erreur lors de l'achat";
                    }
                })
                .catch(err => {
                    errorMessage.textContent = App.t("shop.errors.network_error");
                });
            });
        });
    }
};

App.handleClaimButtonClick = function(button) {
    const user = firebase.auth().currentUser;
    if (!user) { alert(App.t("shop.errors.not_connected")); return; }

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
                        button.textContent = App.t("shop.buttons.claimed");
                        loadPage('recompenses');
                    } else {
                        alert(data.error || App.t("shop.errors.claim_error"));
                        button.disabled = false;
                    }
                });
            });
        });
    }
};

App.handleClaimWeeklyLootboxButtonClick = function(button) {
    const user = firebase.auth().currentUser;
    if (!user) { alert(App.t("shop.errors.not_connected")); return; }

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
                    
                    button.textContent = App.t("shop.buttons.claimed");
                    loadPage('ouverture_coffre');
                } else {
                    alert(data.error || App.t("shop.errors.chest_error"));
                    // Check specific error message from server if needed, or rely on success flag
                    // Simple logic: if error, re-enable unless it's "Already claimed"
                    if (!data.error.includes("Déjà récupéré")) { 
                         button.disabled = false;
                    } else {
                         button.textContent = App.t("shop.buttons.claimed");
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
    
    timerElement.textContent = App.t("shop.timers.weekly_chest", {time: `${days}j ${hours}h ${minutes}m ${seconds}s`});
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

    timerElement.textContent = App.t("shop.timers.special_offer", {time: `${days}j ${hours}h ${minutes}m ${seconds}s`});
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

// ===================== ANIMATIONS & UI =====================
App.checkTitleOverflow = function() {
    document.querySelectorAll('.boutique .bonus-item h2').forEach(h2 => {
        const span = h2.querySelector('span');
        if (!span) return;
        
        // Reset pour mesure précise
        h2.classList.remove('is-scrolling');
        
        // On compare la largeur du contenu (span) avec celle du conteneur (h2)
        if (span.offsetWidth > h2.clientWidth) {
            h2.classList.add('is-scrolling');
        }
    });
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
    setTimeout(App.checkTitleOverflow, 50);
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
    
    // Vérification des débordements de texte après le rendu
    setTimeout(App.checkTitleOverflow, 100);
}

// Lancer l'initialisation une fois que le DOM est prêt
// (dans un projet moderne, on utiliserait DOMContentLoaded, mais c'est plus sûr ainsi)
initializeShop();

window.addEventListener('unload', function() {
    if (App.dailyTimerId) clearTimeout(App.dailyTimerId);
    if (App.weeklyTimerId) clearTimeout(App.weeklyTimerId);
    if (App.specialWeeklyOfferTimerId) clearTimeout(App.specialWeeklyOfferTimerId);
});