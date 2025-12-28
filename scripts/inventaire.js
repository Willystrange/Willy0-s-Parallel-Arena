
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
App.viewShop = function() {
  loadPage("boutique");
}

/* ===================== FONCTIONS D'INVENTAIRE ===================== */
App.updateInventoryDisplay = function() {
  const userData = JSON.parse(localStorage.getItem('userData')) || {};
  
  // Mise à jour des quantités dans l'inventaire
  document.getElementById('stock-xp-inv').textContent = userData.Double_XP_acheté || 0;
  document.getElementById('stock-potion-inv').textContent = userData.Potion_de_Santé_acheté || 0;
  document.getElementById('stock-amulette-inv').textContent = userData.Amulette_de_Régénération_acheté || 0;
  document.getElementById('stock-epee-inv').textContent = userData.epee_tranchante_acheté || 0;
  document.getElementById('stock-elixir-inv').textContent = userData.elixir_puissance_acheté || 0;
  document.getElementById('stock-bouclier-inv').textContent = userData.bouclier_solide_acheté || 0;
  document.getElementById('stock-cape-inv').textContent = userData.Cape_acheté || 0;
  document.getElementById('stock-armure-inv').textContent = userData.armure_fer_acheté || 0;
  document.getElementById('stock-crystal-inv').textContent = userData.crystal_acheté || 0;
  document.getElementById('stock-marque-inv').textContent = userData.marque_chasseur_acheté || 0;
  document.getElementById('stock-purge-inv').textContent = userData.purge_spirituelle_acheté || 0;
  document.getElementById('stock-orbe-inv').textContent = userData.orbe_siphon_acheté || 0;
  
  // Masquer les objets avec quantité 0
  App.toggleItemVisibility('inv-xp', userData.Double_XP_acheté || 0);
  App.toggleItemVisibility('inv-potion', userData.Potion_de_Santé_acheté || 0);
  App.toggleItemVisibility('inv-amulette', userData.Amulette_de_Régénération_acheté || 0);
  App.toggleItemVisibility('inv-epee', userData.epee_tranchante_acheté || 0);
  App.toggleItemVisibility('inv-elixir', userData.elixir_puissance_acheté || 0);
  App.toggleItemVisibility('inv-bouclier', userData.bouclier_solide_acheté || 0);
  App.toggleItemVisibility('inv-cape', userData.Cape_acheté || 0);
  App.toggleItemVisibility('inv-armure', userData.armure_fer_acheté || 0);
  App.toggleItemVisibility('inv-crystal', userData.crystal_acheté || 0);
  App.toggleItemVisibility('inv-marque', userData.marque_chasseur_acheté || 0);
  App.toggleItemVisibility('inv-purge', userData.purge_spirituelle_acheté || 0);
  App.toggleItemVisibility('inv-orbe', userData.orbe_siphon_acheté || 0);
  
  // Masquer les catégories vides
  App.toggleCategoryVisibility();
}

App.toggleItemVisibility = function(itemId, quantity) {
  const item = document.getElementById(itemId);
  if (item) {
    item.style.display = quantity > 0 ? 'flex' : 'none';
  }
}

App.toggleCategoryVisibility = function() {
  const categories = [
    { id: 'category-xp-inv', items: ['inv-xp'] },
    { id: 'category-soins-inv', items: ['inv-potion', 'inv-amulette'] },
    { id: 'category-attaque-inv', items: ['inv-epee', 'inv-elixir', 'inv-marque'] },
    { id: 'category-defense-inv', items: ['inv-bouclier', 'inv-cape'] },
    { id: 'category-autre-inv', items: ['inv-armure', 'inv-crystal', 'inv-purge', 'inv-orbe'] },
  ];
  
  categories.forEach(category => {
    const categoryElement = document.getElementById(category.id);
    const categorySection = categoryElement?.closest('.category-section');
    
    if (categoryElement && categorySection) {
      const hasVisibleItems = category.items.some(itemId => {
        const item = document.getElementById(itemId);
        return item && item.style.display !== 'none';
      });
      
      categorySection.style.display = hasVisibleItems ? 'block' : 'none';
    }
  });
}

/* ===================== FONCTIONS DE TRI ===================== */
App.currentSortMode = 'category';
App.sortModes = [
  { type: 'category', icon: '📂', label: 'Catégorie' },
  { type: 'name', icon: '🔤', label: 'Nom' },
  { type: 'quantity', icon: '🔢', label: 'Quantité' }
];

App.cycleSortMode = function() {
  const currentIndex = App.sortModes.findIndex(mode => mode.type === App.currentSortMode);
  const nextIndex = (currentIndex + 1) % App.sortModes.length;
  const nextMode = App.sortModes[nextIndex];
  
  App.currentSortMode = nextMode.type;
  App.sortInventory(nextMode.type);
  
  // Mettre à jour le bouton
  const sortBtn = document.getElementById('sort-btn');
  if (sortBtn) {
    sortBtn.innerHTML = `${nextMode.icon} ${nextMode.label}`;
  }
}

App.sortInventory = function(sortType) {
  const content = document.querySelector('.content');
  const sections = Array.from(content.querySelectorAll('.category-section'));
  
  // Sauvegarder l'état actuel pour la restauration
  if (!App.originalOrder) {
    App.originalOrder = sections.map(section => section.cloneNode(true));
  }
  
  if (sortType === 'category') {
    // Tri par catégorie (ordre original)
    App.restoreOriginalOrder();
  } else if (sortType === 'name') {
    // Tri alphabétique par nom d'objet
    App.sortByName(sections);
  } else if (sortType === 'quantity') {
    // Tri par quantité (décroissant)
    App.sortByQuantity(sections);
  }
}

App.restoreOriginalOrder = function() {
  const content = document.querySelector('.content');
  content.innerHTML = '';
  App.originalOrder.forEach(section => {
    content.appendChild(section.cloneNode(true));
  });
}

App.sortByName = function(sections) {
  const content = document.querySelector('.content');
  content.innerHTML = '';
  
  // Créer une section unique pour tous les objets triés par nom
  const sortedSection = document.createElement('div');
  sortedSection.className = 'category-section';
  sortedSection.innerHTML = '<h2>Objets triés par nom</h2><div class="category" id="sorted-items"></div>';
  
  const sortedContainer = sortedSection.querySelector('.category');
  
  // Collecter tous les objets visibles
  const allItems = [];
  sections.forEach(section => {
    const items = section.querySelectorAll('.inventory-item');
    items.forEach(item => {
      if (item.style.display !== 'none') {
        const name = item.querySelector('h3').textContent;
        allItems.push({
          element: item.cloneNode(true),
          name: name
        });
      }
    });
  });
  
  // Trier par nom
  allItems.sort((a, b) => a.name.localeCompare(b.name));
  
  // Ajouter les objets triés
  allItems.forEach(item => {
    sortedContainer.appendChild(item.element);
  });
  
  if (allItems.length > 0) {
    content.appendChild(sortedSection);
  }
}

App.sortByQuantity = function(sections) {
  const content = document.querySelector('.content');
  content.innerHTML = '';
  
  // Créer une section unique pour tous les objets triés par quantité
  const sortedSection = document.createElement('div');
  sortedSection.className = 'category-section';
  sortedSection.innerHTML = '<h2>Objets triés par quantité</h2><div class="category" id="sorted-items"></div>';
  
  const sortedContainer = sortedSection.querySelector('.category');
  
  // Collecter tous les objets visibles avec leur quantité
  const allItems = [];
  sections.forEach(section => {
    const items = section.querySelectorAll('.inventory-item');
    items.forEach(item => {
      if (item.style.display !== 'none') {
        const name = item.querySelector('h3').textContent;
        const quantityText = item.querySelector('.quantity span').textContent;
        const quantity = parseInt(quantityText);
        allItems.push({
          element: item.cloneNode(true),
          name: name,
          quantity: quantity
        });
      }
    });
  });
  
  // Trier par quantité (décroissant)
  allItems.sort((a, b) => b.quantity - a.quantity);
  
  // Ajouter les objets triés
  allItems.forEach(item => {
    sortedContainer.appendChild(item.element);
  });
  
  if (allItems.length > 0) {
    content.appendChild(sortedSection);
  }
}

/* ===================== INITIALISATION ===================== */
App.init = function() {
  App.updateInventoryDisplay();
  
  // Message si l'inventaire est vide
  App.checkEmptyInventory();
}

App.checkEmptyInventory = function() {
  const userData = JSON.parse(localStorage.getItem('userData')) || {};
  const totalItems = (userData.Double_XP_acheté || 0) + 
                    (userData.Potion_de_Santé_acheté || 0) + 
                    (userData.Amulette_de_Régénération_acheté || 0) + 
                    (userData.epee_tranchante_acheté || 0) + 
                    (userData.elixir_puissance_acheté || 0) + 
                    (userData.bouclier_solide_acheté || 0) + 
                    (userData.Cape_acheté || 0) + 
                    (userData.armure_fer_acheté || 0) + 
                    (userData.crystal_acheté || 0) +
                    (userData.marque_chasseur_acheté || 0) +
                    (userData.orbe_siphon_acheté || 0) +
                    (userData.purge_spirituelle_acheté || 0)
  
  if (totalItems === 0) {
    const content = document.querySelector('.content');
    if (content) {
      content.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #666;">
          <img src="inventaire.png" alt="Inventaire vide" style="width: 100px; height: 100px; opacity: 0.5; margin-bottom: 1rem;">
          <h2>Votre inventaire est vide</h2>
          <p>Rendez-vous dans la boutique pour acheter des objets !</p>
          <button onclick="App.viewShop()" style="padding: 0.5rem 1rem; margin-top: 1rem; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Aller à la boutique
          </button>
        </div>
      `;
    }
  }
}

// Initialisation
App.init();
