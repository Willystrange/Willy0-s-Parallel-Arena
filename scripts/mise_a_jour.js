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
  if(App.loadingTextElement) App.loadingTextElement.textContent = App.loadingPhrases[randomIndex];
}

// Gestion propre de l'intervalle pour pouvoir le nettoyer
if (App.mise_a_jour_interval) clearInterval(App.mise_a_jour_interval);
App.mise_a_jour_interval = setInterval(App.updateLoadingText, 3000);

App.cleanup = function() {
    if (App.mise_a_jour_interval) clearInterval(App.mise_a_jour_interval);
};

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

App.mise_a_jour = async function() {
  const userData = getUserData();
  // Version actuelle du jeu
  const currentVersion = App.game_version;
  const versionreset = 'B2.2.1.20';

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
    Korb: 0,
    Korb_XP: 0,
    Korb_Level: 1,
    Korb_boost: 0,
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
  // on effectue les mises à jour spécifiques
  if (userData.version === "B2.1.0.00") {
    localStorage.removeItem('rulesAccepted');
  }
  
  // Suppression des anciennes données Summer si nécessaire
  if (App.versionCompare(userData.version || '0.0.0', currentVersion) < 0) {
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
      delete userData.fraude;
      delete userData.lastFraudeReset;
    }
  }

  // Reset complet si version inférieure à versionreset
  if (App.versionCompare(userData.version || '0.0.0', versionreset) < 0) {
    userData.pass_premium = false;
    userData.pass_XP = 0;
    userData.pass_level = 0;
    for (let i = 1; i <= 60; i++) {
      userData[`free_${i}`] = false ;
      userData[`premium_${i}`] = false ;
    }
    userData.semaine1 = false;
    userData.semaine2 = false;
    userData.semaine3 = false;
    userData.semaine4 = false;
    userData.semaine5 = false;
    userData.semaine6 = false;
    userData.quetes_genere = false;
  }

  // Vérification et ajout des clés manquantes
  for (const key in defaultUserData) {
    if (!userData.hasOwnProperty(key)) {
      userData[key] = defaultUserData[key];
    }
  }

  // Mise à jour de la version
  userData.version = currentVersion;

  // 1. Sauvegarde locale immédiate pour éviter le flicker
  localStorage.setItem('userData', JSON.stringify(userData));

  // 2. Synchronisation serveur robuste
  if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
      const user = firebase.auth().currentUser;
      if (user && App.saveUserDataToFirebase) {
          try {
             // On force l'envoi de toutes les données modifiées pour écraser une éventuelle version obsolète du serveur
             await App.saveUserDataToFirebase(user.uid, userData);
             
             // Check if server reverted the version (e.g. if server wasn't restarted to include 'version' in allowed fields)
             const check = getUserData();
             if (check.version !== currentVersion) {
                 console.warn("Le serveur a rejeté la version. Application forcée en local.");
                 userData.version = currentVersion;
                 localStorage.setItem('userData', JSON.stringify(userData));
                 
                 // Feedback visuel pour l'admin
                 if (document.getElementById('loadingText')) {
                    document.getElementById('loadingText').textContent = "Sync serveur incomplète (Redémarrez le serveur !)";
                    document.getElementById('loadingText').style.color = "#ff4444";
                 }
             }
          } catch(e) { 
             console.error("Erreur synchro serveur pendant màj:", e); 
          }
      }
  }

  // 3. Redirection contrôlée
  setTimeout(() => { loadPage('intro'); }, 8000);
}

// Lancement de la procédure avec récupération dynamique de la version
App.initMiseAJour = async function() {
    try {
        const res = await fetch('/api/version');
        if (res.ok) {
            const data = await res.json();
            if (data.version) {
                App.game_version = data.version;
            }
        }
    } catch(e) {}
    
    // Si la version n'est toujours pas définie, fallback sécurisé
    if (!App.game_version || App.game_version === 'VERSION_PLACEHOLDER') {
         App.game_version = 'B2.2.1.20'; 
    }
    
    App.mise_a_jour();
};

App.initMiseAJour();
