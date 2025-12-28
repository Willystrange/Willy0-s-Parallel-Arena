window.App = window.App || {};

App.rewardDisplay = document.getElementById('reward-display');
App.rewardName = document.getElementById('reward-name');
App.rewardStats = document.getElementById('reward-stats');
App.continueButton = document.getElementById('continue-button');

App.boxesToOpen = JSON.parse(sessionStorage.getItem('boxesToOpen')) || [];

function getEquipment(type, userData) {
    const MAX_UNLOCKS_PER_ITEM = 6;
    const probabilities = { commun: 0.7, rare: 0.25, legendaire: 0.05 };
    const rand = Math.random();
    let rarity;

    if (rand < probabilities.legendaire) {
        rarity = 'Légendaire';
    } else if (rand < probabilities.legendaire + probabilities.rare) {
        rarity = 'Rare';
    } else {
        rarity = 'Commun';
    }

    const userEquipments = userData.equipments || [];
    const equipmentCounts = userEquipments.reduce((acc, id) => {
        acc[id] = (acc[id] || 0) + 1;
        return acc;
    }, {});

    // Robust access to equipment list
    const allEquipments = (window.App && window.App.equipments && window.App.equipments.length > 0) 
                          ? window.App.equipments 
                          : (window.equipments || []);

    console.log(`DEBUG: Attempting to open chest type: ${type}, Rarity: ${rarity}`);
    console.log(`DEBUG: Total equipments available: ${allEquipments.length}`);

    if (allEquipments.length === 0) {
        console.error("DEBUG: Equipment list is empty!");
        return null;
    }

    let possibleItems = allEquipments.filter(e => 
        e.type.toLowerCase() === type.toLowerCase() && 
        e.rarity.toLowerCase() === rarity.toLowerCase() &&
        (equipmentCounts[e.id] || 0) < MAX_UNLOCKS_PER_ITEM
    );

    if (possibleItems.length === 0) {
        console.log("DEBUG: No items match rarity and type, falling back to type only.");
        possibleItems = allEquipments.filter(e =>
            e.type.toLowerCase() === type.toLowerCase() &&
            (equipmentCounts[e.id] || 0) < MAX_UNLOCKS_PER_ITEM
        );
        if (possibleItems.length === 0) {
            console.log("DEBUG: No items match type, falling back to any item.");
            possibleItems = allEquipments.filter(e =>
                (equipmentCounts[e.id] || 0) < MAX_UNLOCKS_PER_ITEM
            );
            if (possibleItems.length === 0) {
                console.warn("DEBUG: Absolutely no items available to unlock!");
                return null;
            }
        }
    }

    // Reduce the chance of getting duplicates
    const weightedItems = [];
    possibleItems.forEach(item => {
        const count = equipmentCounts[item.id] || 0;
        // Assign a higher weight to items the user has fewer of.
        // The weight is inversely proportional to the number of copies owned.
        const weight = 1 / (count + 1);
        for (let i = 0; i < Math.ceil(weight * 10); i++) {
            weightedItems.push(item);
        }
    });

    return weightedItems[Math.floor(Math.random() * weightedItems.length)];
}

function displayReward(equipment, userData) {
    if (!equipment) {
        App.rewardName.textContent = "Inventaire plein";
        App.rewardStats.innerHTML = "Vous avez atteint le nombre maximum d'exemplaires pour tous les équipements possibles de ce coffre.";
        return; // Stop here if no reward was given
    }

    App.rewardName.textContent = equipment.name;
    let statsText = `Rareté: ${equipment.rarity}`;
    for (const [stat, value] of Object.entries(equipment.stats)) {
        if (parseInt(value) !== 0) {
            statsText += `<br>${stat}: ${value}`;
        }
    }
    if (equipment.bonus && equipment.bonus.description) {
        statsText += `<br>${equipment.bonus.description}`;
    }
    App.rewardStats.innerHTML = statsText;

    if (!userData.equipments) {
        userData.equipments = [];
    }
    userData.equipments.push(equipment.id);
    saveUserData(userData);
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

    const token = await user.getIdToken();
    const res = await fetch('/api/lootbox/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId: user.uid, boxType })
    });
    const data = await res.json();

    if (data.success) {
        localStorage.setItem('userData', JSON.stringify(data.userData));
        
        // On cherche les détails de l'item dans notre liste locale pour l'affichage
        const allEquipments = (window.App && window.App.equipments) ? window.App.equipments : [];
        let equipment = allEquipments.find(e => e.id === data.reward.id);
        
        // Fallback si l'ID généré par le serveur n'est pas dans la liste client
        if (!equipment) {
            equipment = { name: "Nouvel Équipement", rarity: data.reward.rarity, stats: {} };
        }

        displayReward(equipment, data.userData);
        sessionStorage.setItem('boxesToOpen', JSON.stringify(App.boxesToOpen));
    }
}

App.continueButton.onclick = () => {
    openNextBox();
};

openNextBox();