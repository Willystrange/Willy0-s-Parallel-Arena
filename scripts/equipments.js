window.App = window.App || {};
App.equipments = App.equipments || window.equipments || [];

// Affiche un message pour confirmer que le script est bien chargé
console.log('DEBUG: equipments.js script loaded.');

App.orderRarity = ['commun', 'inhabituel', 'rare', 'épique', 'légendaire'];

App.loadFilter = function() {
  const ud = getUserData();
  App.filterAttribute = ud.equipmentFilterAttribute || 'name';
  const attrSel = document.getElementById('filter-attribute');
  if (attrSel) attrSel.value = App.filterAttribute;
};

App.saveFilter = function(attr) {
  const ud = getUserData();
  ud.equipmentFilterAttribute = attr;
  saveUserData(ud);
  App.filterAttribute = attr;
};

App.getEquipmentValue = function(item, attribute) {
    switch (attribute) {
        case 'rarity':
            // The order is defined in App.orderRarity, returning the index for sorting
            return App.orderRarity.indexOf(item.rarity.toLowerCase());
        case 'type':
            return item.type || '';
        case 'name':
        default:
            return item.name;
    }
};

App.getSortedInventoryIds = function(inventoryIds) {
    // Désactivation de tout tri : on renvoie l'ordre brut tel quel
    return inventoryIds;
};



// Couleurs associées à la rareté et au type
App.rarityColors = {
    "Commun": "#95a5a6",
    "Rare": "#3498db",
    "Légendaire": "#f39c12"
};

App.typeColors = {
    "Attaque": "#e74c3c",
    "Défense": "#2ecc71",
    "Agilité": "#f1c40f",
    "Équilibre": "#e67e22"
};

App.createEquipmentElement = function(item, characterName, isEquipped) {
    const container = document.createElement('div');
    container.classList.add('inventory-item');

    // Création de la pastille de couleur
    const indicator = document.createElement('div');
    indicator.classList.add('equipment-indicator');
    // Normalisation de la clé de rareté (Majuscule au début) pour correspondre aux clés
    const rarityKey = item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1);
    const rarityColor = App.rarityColors[rarityKey] || '#ffffff';
    const typeColor = App.typeColors[item.type] || '#ffffff';
    indicator.style.background = `linear-gradient(to right, ${rarityColor} 0%, ${rarityColor} 50%, ${typeColor} 50%, ${typeColor} 100%)`;

    // Création du nom de l'équipement
    const name = document.createElement('div');
    name.classList.add('equipment-name');
    name.textContent = App.t('equipment_names.' + item.id) || item.name;

    // Assemblage
    const infoContainer = document.createElement('div');
    infoContainer.style.display = 'flex';
    infoContainer.style.alignItems = 'center';
    infoContainer.appendChild(indicator);
    infoContainer.appendChild(name);

    container.appendChild(infoContainer);

    container.addEventListener('click', (event) => {
        App.displayEquipmentDetails(item, characterName, isEquipped, event.currentTarget);
    });

    return container;
};

App.renderEquipmentUI = function(characterName) {
    console.log(`DEBUG: App.renderEquipmentUI() called for ${characterName}`);
    const userData = getUserData();
    if (!userData.characters) userData.characters = {};
    if (!userData.characters[characterName]) {
        userData.characters[characterName] = { equipments: [] };
        saveUserData(userData);
    }

    // Équipements équipés pour ce personnage
    const equippedIds = userData.characters[characterName].equipments || [];
    const equippedContainer = document.getElementById('equipped-items');
    if (!equippedContainer) {
        console.error('Container #equipped-items introuvable');
    } else {
        equippedContainer.innerHTML = '';
        if (equippedIds.length === 0) {
            equippedContainer.innerHTML = `<div>${App.t('equipments.no_equipped')}</div>`;
        } else {
            equippedIds.forEach(itemId => {
                const item = App.getEquipmentById(itemId);
                if (item) {
                    const element = App.createEquipmentElement(item, characterName, true);
                    equippedContainer.appendChild(element);
                }
            });
        }
    }

    // Inventaire – objets non équipés
    const allEquipped = Object.values(userData.characters)
        .flatMap(c => c.equipments || []);
    
    const unequippedInventory = [...(userData.equipments || [])];
    allEquipped.forEach(equippedId => {
        const index = unequippedInventory.indexOf(equippedId);
        if (index > -1) {
            unequippedInventory.splice(index, 1);
        }
    });
    
    const inventoryIds = App.getSortedInventoryIds(unequippedInventory);

    const inventoryContainer = document.getElementById('inventory-items');
    if (!inventoryContainer) {
        console.error('Container #inventory-items introuvable');
        return;
    }
    inventoryContainer.innerHTML = '';
    if (inventoryIds.length === 0) {
        inventoryContainer.innerHTML = `<div>${App.t('equipments.no_inventory')}</div>`;
    } else {
        inventoryIds.forEach(itemId => {
            const item = App.getEquipmentById(itemId);
            if (item) {
                const element = App.createEquipmentElement(item, characterName, false);
                inventoryContainer.appendChild(element);
            }
        });
    }
};

App.displayEquipmentDetails = function(item, characterName, isEquipped = false, buttonElement) {
    // Supprimer toute carte de détails existante
    const existingDetailDiv = document.querySelector('.equipment-details');
    if (existingDetailDiv) {
        existingDetailDiv.remove();
    }

    // Créer un nouveau conteneur pour les détails
    const detailDiv = document.createElement('div');
    detailDiv.classList.add('equipment-details');

    // Génération de la liste des stats non nulles
    const statsHtml = Object.entries(item.stats)
        .filter(([_, value]) => value !== 0)
        .map(([key, value]) => `<li>${App.t('equipments.stats.' + key) || key} : ${value}</li>`)
        .join('');

    // Texte pour le bonus si présent
    let bonusDesc = item.bonus ? (App.t('equipment_bonuses.' + item.id)) : null;
    if (bonusDesc === 'equipment_bonuses.' + item.id) bonusDesc = item.bonus.description;

    const bonusHtml = bonusDesc
        ? `<p><strong>${App.t('equipments.detail_effect')}</strong> ${bonusDesc}</p>`
        : `<p>${App.t('equipments.detail_no_effect')}</p>`;

    // Détermination du libellé et de l’action du bouton
    const btnText   = isEquipped ? App.t('equipments.btn_remove') : App.t('equipments.btn_equip');
    const btnAction = isEquipped
        ? () => { App.unequipItem(characterName, item.id); }
        : () => { App.equipItem(characterName, item.id); };

    const rarityKey = item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1);
    const rarityTrad = App.t('equipments.rarities.' + rarityKey) || item.rarity;

    // Injection du contenu
    detailDiv.innerHTML = `
        <h3>${App.t('equipment_names.' + item.id) || item.name}</h3>
        <p class="rarity-${item.rarity}">
            <strong>${App.t('equipments.detail_rarity')}</strong> ${rarityTrad}
        </p>
        <ul>${statsHtml}</ul>
        ${bonusHtml}
        <button class="equipments detail-btn">${btnText}</button>
    `;

    // Insérer la carte de détails juste après le bouton cliqué
    buttonElement.parentNode.insertBefore(detailDiv, buttonElement.nextSibling);

    // Rendre la carte visible et faire défiler le titre en haut de l'écran
    setTimeout(() => {
        detailDiv.classList.add('show');
        const titleElement = detailDiv.querySelector('h3');
        const content = document.querySelector('.content');
        if (titleElement && content) {
            const topPos = titleElement.getBoundingClientRect().top + content.scrollTop - 25;
            content.scrollTo({ top: topPos, behavior: 'smooth' });
        }
    }, 100); // Délai pour s'assurer que l'élément est rendu avant de défiler

    // Association du clic sur le bouton
    detailDiv.querySelector('.detail-btn').onclick = () => {
        btnAction();
        detailDiv.classList.remove('show');
        // Mise à jour de l'affichage après action
        App.renderEquipmentUI(characterName);
    };
};



App.initEquipmentsPage = async function() {
    console.log('DEBUG: App.initEquipmentsPage() called.');
    const characterName = sessionStorage.getItem('characterToEquip');
    console.log(`DEBUG: Character name from sessionStorage: ${characterName}`);

    if (!characterName) {
        console.log('DEBUG: No character name found, redirecting to perso_stats.');
        loadPage('perso_stats');
        return;
    }

    // Ensure data is loaded
    if (!App.equipments || App.equipments.length === 0) {
        await App.loadEquipmentsData();
    }

    const titleEl = document.getElementById('character-name-title');
    if (titleEl) {
        titleEl.textContent = `${characterName}`;
    } else {
        console.log('DEBUG: Title element #character-name-title not found!');
    }

    App.loadFilter();
    const attrSel = document.getElementById('filter-attribute');
    if (attrSel) {
        attrSel.addEventListener('change', () => {
            App.saveFilter(attrSel.value);
            App.renderEquipmentUI(characterName);
        });
    }

    // Attendre les traductions avant le premier rendu
    if (App.translations && Object.keys(App.translations).length > 0) {
        App.translatePage();
        App.renderEquipmentUI(characterName);
    } else {
        window.addEventListener('translationsLoaded', () => {
             App.translatePage();
             App.renderEquipmentUI(characterName);
        }, { once: true });
        
        // Sécurité en cas de raté de l'événement
        setTimeout(() => {
             App.translatePage();
             App.renderEquipmentUI(characterName);
        }, 500);
    }

    // Gestion de la modale d'aide
    const helpIcon = document.getElementById('help-icon');
    const helpModal = document.getElementById('help-modal');
    const closeButton = document.querySelector('.close-button');

    helpIcon.addEventListener('click', () => {
        helpModal.style.display = 'flex';
        helpModal.classList.remove('modal-hidden');
    });

    const hideModal = () => {
        helpModal.style.display = 'none';
        helpModal.classList.add('modal-hidden');
    };

    closeButton.addEventListener('click', hideModal);

    window.addEventListener('click', (event) => {
        if (event.target == helpModal) {
            hideModal();
        }
    });
};



App.getEquipmentById = function(id) {
    return App.equipments.find(eq => eq.id === id);
};

// ... (les autres fonctions comme equipItem, unequipItem restent les mêmes)
App.equipItem = function(characterName, itemId) {
    const userData = getUserData();

    // Assurer que la structure de données de l'utilisateur existe
    if (!userData.characters) userData.characters = {};
    if (!userData.characters[characterName]) userData.characters[characterName] = { equipments: [] };
    if (!userData.characters[characterName].equipments) userData.characters[characterName].equipments = [];

    const characterEquipments = userData.characters[characterName].equipments;
    const newItem = App.getEquipmentById(itemId);

    if (!newItem) {
        console.error(`Équipement non trouvé pour l'ID : ${itemId}`);
        return;
    }

    // Vérifier la limite de 3 équipements
    if (characterEquipments.length >= 3) {
        alert(App.t('equipments.error_limit'));
        console.log("Tentative d'équiper un 4ème objet alors que l'inventaire est plein.");
        return;
    }

    // Vérifier si l'équipement est déjà équipé par ce personnage
    if (characterEquipments.includes(itemId)) {
        alert(App.t('equipments.error_already_equipped'));
        console.log(`Tentative d'équiper l'objet ${itemId} qui est déjà équipé.`);
        return;
    }

    // Si tout est bon, équiper l'objet
    characterEquipments.push(itemId);
    saveUserData(userData);
    App.renderEquipmentUI(characterName); // Mettre à jour l'interface
};

App.unequipItem = function(characterName, itemId) {
    const userData = getUserData();
    if (userData.characters && userData.characters[characterName] && userData.characters[characterName].equipments) {
        const index = userData.characters[characterName].equipments.indexOf(itemId);
        if (index > -1) {
            userData.characters[characterName].equipments.splice(index, 1);
            saveUserData(userData);
            App.renderEquipmentUI(characterName);
        }
    }
};