// Définir la version du jeu
const game_version = '2.0.0';

// Fonction pour ajuster aléatoirement les personnages


// Vérifie si les données utilisateur existent, sinon initialise avec les valeurs par défaut
if (!localStorage.getItem('userData')) {
  localStorage.setItem('userData', JSON.stringify({
      nbr_perso: 2,
      victoires: 0,
      defaites: 0,
      trophees: 0,
      argent: 0,
      VICTOIRE: false,
      version: '2.0.0',
      recompense: 0,
      perso_recompense: 0,
      xp_du_jour: 0,
      Willy: 1,
      Willy_XP: 0,
      Willy_Level: 1,
      Willy_boost: 0,
      Cocobi: 1,
      Cocobi_XP: 0,
      Cocobi_Level: 1,
      Cocobi_boost: 0,
      Oiseau: 0,
      Oiseau_XP: 0,
      Oiseau_Level: 1,
      Oiseau_boost: 0,
      Gros_Nounours: 0,
      Gros_Nounours_XP: 0,
      Gros_Nounours_Level: 1,
      Gros_Nounours_boost: 0,
      Baleine: 0,
      Baleine_XP: 0,
      Baleine_Level: 1,
      Baleine_boost: 0,
      Doudou: 0,
      Doudou_XP: 0,
      Doudou_Level: 1,
      Doudou_boost: 0,
      Coeur: 0,
      Coeur_XP: 0,
      Coeur_Level: 1,
      Coeur_boost: 0,
      Diva: 0,
      Diva_XP: 0,
      Diva_Level: 1,
      Diva_boost: 0,
      Poulpy: 0,
      Poulpy_XP: 0,
      Poulpy_Level: 1,
      Poulpy_boost: 0,
      Colorina: 0,
      Colorina_XP: 0,
      Colorina_Level: 1,
      Colorina_boost: 0,
      Double_XP: 5,
      Double_XP_acheté: 0,
      Potion_de_Santé_acheté: 0,
      Amulette_de_Régénération_acheté: 0,
      lastDoubleXPCheck: 0,
      theme: false // Défaut clair
  }));
}

// Fonction pour obtenir les données utilisateur de localStorage
function getUserData() {
  const userData = JSON.parse(localStorage.getItem('userData'));
  
  return userData || {}; // Retourne un objet vide si les données ne sont pas définies
}

// Fonction pour sauvegarder les données utilisateur dans localStorage
function saveUserData(userData) {
  localStorage.setItem('userData', JSON.stringify(userData));
}

// Fonction pour basculer entre les thèmes
