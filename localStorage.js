// Définir la version du jeu
const game_version = 1.023;

// Fonction pour ajuster aléatoirement les personnages
function adjustCharacters(nbr_perso) {
  const userData = getUserData();
  const characters = [
    'Willy', 'Cocobi', 'Oiseau', 'Gros_Nounours', 'Baleine', 'Doudou', 
    'Coeur', 'Diva', 'Poulpy', 'Colorina'
  ];

  // Filtrer les personnages déjà à 1
  const charactersAlreadyOne = characters.filter(char => userData[char] === 1);

  // Si le nombre de personnages à 1 est déjà égal à nbr_perso, pas besoin d'ajuster
  if (charactersAlreadyOne.length === nbr_perso) {
    return;
  }

  // Tant que le nombre de personnages à 1 n'est pas égal à nbr_perso, ajuster aléatoirement
  while (charactersAlreadyOne.length < nbr_perso) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    const character = characters[randomIndex];

    // Vérifier si le personnage sélectionné est déjà à 1, si oui, continuer la boucle
    if (userData[character] === 1) {
      continue;
    }

    // Mettre ce personnage à 1
    userData[character] = 1;

    // Mettre à jour nom_first à true si nécessaire
    if (!userData[`${character}_first`]) {
      userData[`${character}_first`] = true;
    }

    // Ajouter ce personnage à la liste des personnages à 1
    charactersAlreadyOne.push(character);
  }

  // Sauvegarder les données mises à jour dans localStorage
  saveUserData(userData);
}

// Vérifie si les données utilisateur existent, sinon initialise avec les valeurs par défaut
if (!localStorage.getItem('userData')) {
  localStorage.setItem('userData', JSON.stringify({
    nbr_perso: 2,
    victoires: 0,
    defaites: 0,
    trophees: 0,
    argent: 0,
    VICTOIRE: false,
    version: 1.023,
    xp_du_jour: 0,
    Willy: 1,
    Willy_XP: 0,
    Willy_Level: 1,
    Cocobi: 1,
    Cocobi_XP: 0,
    Cocobi_Level: 1,
    Oiseau: 0,
    Oiseau_XP: 0,
    Oiseau_Level: 1,
    Gros_Nounours: 0,
    Gros_Nounours_XP: 0,
    Gros_Nounours_Level: 1,
    Baleine: 0,
    Baleine_XP: 0,
    Baleine_Level: 1,
    Doudou: 0,
    Doudou_XP: 0,
    Doudou_Level: 1,
    Coeur: 0,
    Coeur_XP: 0,
    Coeur_Level: 1,
    Diva: 0,
    Diva_XP: 0,
    Diva_Level: 1,
    Poulpy: 0,
    Poulpy_XP: 0,
    Poulpy_Level: 1,
    Colorina: 0,
    Colorina_XP: 0,
    Colorina_Level: 1,
    Double_XP: 5,
    Double_XP_acheté: 0,
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

// Appeler la fonction pour ajuster les personnages au chargement de la page ou au besoin
const userData = getUserData();
adjustCharacters(userData.nbr_perso);
