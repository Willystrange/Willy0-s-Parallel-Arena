window.App = window.App || {};

App.rewardDisplay = document.getElementById('reward-display');
App.rewardName = document.getElementById('reward-name');
App.rewardStats = document.getElementById('reward-stats');
App.continueButton = document.getElementById('continue-button');

App.boxesToOpen = JSON.parse(sessionStorage.getItem('boxesToOpen')) || [];

function displayReward(equipment, userData) {
    if (!equipment) {
        App.rewardName.textContent = App.t('lootbox.inventory_full_title');
        App.rewardStats.innerHTML = App.t('lootbox.inventory_full_desc');
        return; // Stop here if no reward was given
    }

    // Traduction du nom de l'équipement
    const nameKey = equipment.id ? `equipment_names.${equipment.id}` : null;
    const translatedName = nameKey ? App.t(nameKey) : equipment.name;
    // Si la traduction n'est pas trouvée (retourne la clé), on utilise le nom par défaut
    App.rewardName.textContent = (translatedName !== nameKey) ? translatedName : equipment.name;
    
    // Traduction de la rareté avec première lettre majuscule pour correspondre aux clés JSON
    // Clés attendues : "Commun", "Rare", "Légendaire" (data/fr.json -> equipments.rarities)
    let rarityKey = equipment.rarity;
    if (rarityKey) {
        rarityKey = rarityKey.charAt(0).toUpperCase() + rarityKey.slice(1).toLowerCase();
    }
    const rarityTrad = App.t('equipments.rarities.' + rarityKey);
    // Fallback si la trad échoue
    const finalRarity = (rarityTrad !== `equipments.rarities.${rarityKey}`) ? rarityTrad : equipment.rarity;

    let statsText = `${App.t('lootbox.rarity', {value: finalRarity})}`;
    
    for (const [stat, value] of Object.entries(equipment.stats)) {
        if (parseInt(value) !== 0) {
            const statName = App.t('equipments.stats.' + stat);
            // Fallback pour le nom de stat
            const finalStatName = (statName !== `equipments.stats.${stat}`) ? statName : stat;
            statsText += `<br>${finalStatName}: ${value}`;
        }
    }
    if (equipment.bonus) {
        const bonusDesc = App.t('equipment_bonuses.' + equipment.id);
        const finalBonusDesc = (bonusDesc !== 'equipment_bonuses.' + equipment.id) ? bonusDesc : equipment.bonus.description;
        if (finalBonusDesc) {
            statsText += `<br><strong>${App.t('equipments.detail_effect')}</strong> ${finalBonusDesc}`;
        }
    }
    App.rewardStats.innerHTML = statsText;

    // Suppression du code de duplication ici. 
    // Les données utilisateur (userData) reçues du serveur contiennent déjà le nouvel équipement.
    // displayReward ne sert qu'à l'affichage.
}

async function openNextBox() {
    if (App.boxesToOpen.length === 0) {
        if (sessionStorage.getItem('boughtFromShop')) {
            sessionStorage.setItem('shopSection', 'equipments');
            sessionStorage.removeItem('boughtFromShop');
        }
        loadPage('boutique');
        return;
    }

    const boxType = App.boxesToOpen.shift();
    const user = firebase.auth().currentUser;
    if (!user) return;

    const recaptchaToken = await App.getRecaptchaToken('lootbox_open');
    const token = await user.getIdToken();
    const res = await fetch('/api/lootbox/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId: user.uid, boxType, recaptchaToken })
    });
    const data = await res.json();

    if (data.success) {
        localStorage.setItem('userData', JSON.stringify(data.userData));
        
        // On cherche les détails de l'item dans notre liste locale pour l'affichage
        const allEquipments = (window.App && window.App.equipments) ? window.App.equipments : [];
        let equipment = allEquipments.find(e => e.id === data.reward.id);
        
        // Fallback si l'ID généré par le serveur n'est pas dans la liste client
        if (!equipment) {
            equipment = { 
                name: App.t('lootbox.new_equipment'), 
                rarity: data.reward.rarity, 
                stats: {} 
            };
        }

        displayReward(equipment, data.userData);
        sessionStorage.setItem('boxesToOpen', JSON.stringify(App.boxesToOpen));
    }
}

App.continueButton.onclick = () => {
    openNextBox();
};

// Initialisation avec attente des traductions
App.initLootbox = function() {
    if (App.translations && Object.keys(App.translations).length > 0) {
        App.translatePage();
        openNextBox();
    } else {
        window.addEventListener('translationsLoaded', () => {
             App.translatePage();
             openNextBox();
        }, { once: true });
        
        setTimeout(() => {
             App.translatePage();
             openNextBox();
        }, 500);
    }
};

App.initLootbox();