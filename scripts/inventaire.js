
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
    { id: 'category-attaque-inv', items: ['inv-epee', 'inv-elixir'] },
    { id: 'category-defense-inv', items: ['inv-bouclier', 'inv-cape'] },
    { id: 'category-autre-inv', items: ['inv-armure', 'inv-crystal'] }
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
                    (userData.crystal_acheté || 0);
  
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
