window.App = window.App || {};
// Phrases de chargement à afficher
App.loadingPhrases = [
  "Mise à jour en cours...",
  "Ne quittez pas...",
  "Cela peut prendre plusieurs secondes...",
  "Chargement en cours...",
  "Veuillez patienter...",
  "Nous préparons votre contenu...",
  "Optimisation des données...",
  "Chargement des ressources...",
  "Analyse des informations...",
];

App.loadingTextElement = document.getElementById('loadingText');
App.updateLoadingText = function() {
  const randomIndex = Math.floor(Math.random() * App.loadingPhrases.length);
  App.loadingTextElement.textContent = App.loadingPhrases[randomIndex];
}
setInterval(App.updateLoadingText, 3000);
setTimeout(() => { loadPage('intro'); }, 10000);

// Récupération et sauvegarde des données utilisateur dans le localStorage

// Comparaison des numéros de version en ne conservant que les chiffres et les points
App.versionCompare = function(v1, v2) {
  // Nettoyage des versions pour retirer tout caractère non numérique (sauf le point)
  const cleanVersion = v => v.replace(/[^0-9.]/g, '');
  const v1Parts = cleanVersion(v1).split('.').map(Number);
  const v2Parts = cleanVersion(v2).split('.').map(Number);
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const num1 = v1Parts[i] || 0;
    const num2 = v2Parts[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

App.mise_a_jour = function() {
  const userData = getUserData();
  // Version actuelle du jeu
  const currentVersion = 'B2.2.0.00';
  const versionreset = 'B2.2.0.00';

  // Valeurs par défaut pour les données utilisateur
  const defaultUserData = {
    pass_premium: false,
    pass_XP: 0,
    pass_level: 0,
    nbr_perso: 2,
    victoires: 0,
    defaites: 0,
    manches_max: 0,
    XP_jour: 0,
    gagnant: '',
    fin_manche: 0,
    fin_xp: 0,
    fin_argent: 0,
    fin_trophees: 0,
    trophees: 0,
    tropheesMax: 0,
    argent: 0,
    VICTOIRE: false,
    version: currentVersion,
    recompense: 0,
    perso_recompense: 0,
    xp_du_jour: 0,
    Boompy: 0,
    Boompy_XP: 0,
    Boompy_Level: 1,
    Boompy_boost: 0,
    Willy: 1,
    Willy_XP: 0,
    Willy_Level: 1,
    Willy_boost: 0,
    Cocobi: 0,
    Cocobi_XP: 0,
    Cocobi_Level: 1,
    Cocobi_boost: 0,
    Oiseau: 0,
    Oiseau_XP: 0,
    Oiseau_Level: 1,
    Oiseau_boost: 0,
    Grours: 0,
    Grours_XP: 0,
    Grours_Level: 1,
    Grours_boost: 0,
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
    Perro: 0,
    Perro_XP: 0,
    Perro_Level: 1,
    Perro_boost: 0,
    Poulpy: 0,
    Poulpy_XP: 0,
    Poulpy_Level: 1,
    Poulpy_boost: 0,
    Colorina: 1,
    Colorina_XP: 0,
    Colorina_Level: 1,
    Colorina_boost: 0,
    Rosalie: 0,
    Rosalie_XP: 0,
    Rosalie_Level: 1,
    Rosalie_boost: 0,
    Sboonie: 0,
    Sboonie_XP: 0,
    Sboonie_Level: 1,
    Sboonie_boost: 0,
    Inconnu: 0,
    Inconnu_XP: 0,
    Inconnu_Level: 1,
    Inconnu_boost: 0,
    Nautilus: 0,
    Nautilus_XP: 0,
    Nautilus_Level: 1,
    Nautilus_boost: 0,
    Double_XP: 5,
    Double_XP_acheté: 0,
    Potion_de_Santé_acheté: 0,
    Amulette_de_Régénération_acheté: 0,
    epee_tranchante_acheté: 0,
    elixir_puissance_acheté: 0,
    armure_fer_acheté: 0,
    bouclier_solide_acheté: 0,
    Cape_acheté: 0,
    crystal_acheté: 0,
    lastDoubleXPCheck: 0,
    lastFraudeReset: 0,
    boutique_recompense: false,
    semaine1: false,
    semaine2: false,
    semaine3: false,
    semaine4: false,
    semaine5: false,
    semaine6: false,
    crystaux_parrallels: 0,
    quetes_jour: false,
    quete1_type: "",
    quete1_text: "",
    quete1_total: "",
    quete1_current: "",
    quete1_character: "",
    quete2_type: "",
    quete2_text: "",
    quete2_total: "",
    quete2_current: "",
    quete2_character: "",
    quete3_type: "",
    quete3_text: "",
    quete3_total: "",
    quete3_current: "",
    quete3_character: "",
    partie_commencee: false,
  };

  // Si la version enregistrée est antérieure à la version actuelle,
  // on effectue les mises à jour spécifiques (exemple : suppression des anciennes données hebdomadaires)
  if (userData.version === "B2.1.0.00") {
    localStorage.removeItem('rulesAccepted');
  }
  if (App.versionCompare(userData.version || '0.0.0', currentVersion) < 0) {
    userData.semaine1 = false;
    userData.semaine2 = false;
    userData.semaine3 = false;
    userData.semaine4 = false;
    userData.semaine5 = false;
    userData.semaine6 = false;
    userData.quete_genere = false;

    if (userData) {
      for (let i = 1; i <= 15; i++) {
        delete userData[`Summer${i}_text`];
        delete userData[`Summer${i}_total`];
        delete userData[`Summer${i}_current`];
        delete userData[`Summer${i}_type`];
        delete userData[`Summer${i}_completed`];
        delete userData[`Summer${i}_reward`];
        delete userData[`Summer${i}_active`];
      }
      delete userData.summer_genere;
      

      localStorage.setItem('userData', JSON.stringify(userData));
    }
  }
  if (App.versionCompare(userData.version || '0.0.0', versionreset) < 0) {
    userData.pass_premium = false;
    userData.pass_XP = 0;
    userData.pass_level = 0;
    for (let i = 1; i <= 60; i++) {
      userData[`free_${i}`] = false ;
      userData[`premium_${i}`] = false ;
    }
  }
  // Vérification et ajout des clés manquantes avec leur valeur par défaut
  for (const key in defaultUserData) {
    if (!userData.hasOwnProperty(key)) {
      userData[key] = defaultUserData[key];
    }
  }

  // On s'assure que la version est toujours à jour
  userData.version = currentVersion;

  // Sauvegarde des données mises à jour
  saveUserData(userData);
}

// Exécution de la mise à jour dès le chargement de la page
App.mise_a_jour();