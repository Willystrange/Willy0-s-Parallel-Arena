// On part du principe que le namespace App existe déjà
window.App = window.App || {};

/* ---------- Fonctions de cryptage/décryptage ---------- */
App.secretKey = "ta_clé_secrète"; // à placer en haut de ton fichier app.js
App.encrypt = function(data) {
  try {
    return CryptoJS.AES.encrypt(data, App.secretKey).toString();
  } catch (error) {
    console.error('Erreur de cryptage:', error);
    alert('Erreur de cryptage des données.');
    return '';
  }
};

App.decrypt = function(data) {
  try {
    const bytes = CryptoJS.AES.decrypt(data, App.secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Erreur de décryptage:', error);
    alert('Erreur de décryptage des données.');
    return '';
  }
};

firebase.auth().onAuthStateChanged(user => {
  if (user) {
    console.log("Utilisateur authentifié avec UID :", user.uid);
    App.User = true;
    App.userId = user.uid;
    // S'assurer que userData existe
    let currentUserData = getUserData();
    saveUserData(currentUserData);
  } else {
    console.log("Aucun utilisateur authentifié");
  }
});

/* ---------- Mise à jour de l'interface ---------- */
App.updateUI = function() {
  document.getElementById('loginButton').style.display = App.User ? 'none' : 'block';
  document.getElementById('logoutButton').style.display = App.User ? 'block' : 'none';
};

firebase.auth().onAuthStateChanged(() => App.updateUI());

/* ---------- Actions sur les sauvegardes ---------- */
App.handleImportBackup = function() {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.txt';
  fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = App.decrypt(e.target.result);
        const userData = JSON.parse(importedData);
        saveUserData(userData);
        alert('Sauvegarde importée avec succès !');
        location.reload();
      } catch (error) {
        alert("Erreur lors de l'importation. Vérifiez la clé et l'intégrité des données.");
      }
    };
    reader.readAsText(file);
  });
  fileInput.click();
};

App.handleDownloadBackup = function() {
  try {
    const userData = getUserData();
    const encryptedData = App.encrypt(JSON.stringify(userData));
    const blob = new Blob([encryptedData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const container = document.getElementById('downloadLinkContainer');
    container.innerHTML = '';
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Willy0_s_Parallel_Arena_backup.txt';
    a.textContent = 'Télécharger la sauvegarde';
    a.className = 'button';
    a.style.marginTop = '10px';
    container.appendChild(a);
    alert('Sauvegarde effectuée avec succès ! Cliquez sur le lien pour télécharger le fichier.');
  } catch (error) {
    alert('Erreur lors de la sauvegarde des données.');
  }
};

App.updateBackup = function() {
  const userData = getUserData();
  const defaultUserData = {
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
    argent: 0,
    VICTOIRE: false,
    version: 'B2.1.0.02',
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
    difficulty: "hard"
  };

  Object.keys(defaultUserData).forEach(key => {
    if (!(key in userData)) {
      userData[key] = defaultUserData[key];
    }
  });
  saveUserData(userData);
  alert('Mise à jour de la sauvegarde effectuée.');
};

/* ---------- Déconnexion ---------- */
App.firebaseConfig = firebaseConfig;
App.firebaseApp = firebase.initializeApp(App.firebaseConfig);
App.auth = firebase.auth();
App.database = firebase.database();

App.logout = function() {
  const userData = getUserData();
  if (App.auth.currentUser) {
    const userId = App.auth.currentUser.uid;
    database.ref(`users/${userId}/userData`).set(userData, (error) => {
      if (error) {
        alert('Erreur lors de la sauvegarde : ' + error.message);
      } else {
        App.auth.signOut().then(() => {
          localStorage.removeItem('connection');
          localStorage.removeItem('userData');
          window.location.reload();
        })
      }
    });
  } else {
    alert("Aucun utilisateur n'est connecté.");
  }
};

/* ---------- Initialisation de l'interface Backup ---------- */
App.initBackupInterface = function() {
  document.getElementById('importBackup').addEventListener('click', App.handleImportBackup);
  document.getElementById('downloadBackup').addEventListener('click', App.handleDownloadBackup);
  document.getElementById('updateBackup').addEventListener('click', App.updateBackup);
  document.getElementById('contactDev').addEventListener('click', () => {
    loadPage('feed-back');
  });
  document.getElementById('logoutButton').addEventListener('click', (e) => {
    e.preventDefault();
    App.logout();
  });

  // Mise à jour de l'interface et affichage de la version
  App.updateUI();
  const userData = getUserData();
  const versionInfo = document.getElementById('versionInfo');
  versionInfo.textContent = userData.version ? 'v.' + userData.version : 'Version non disponible';
}

// Si l'autoplay a déjà été activé, relancer la musique

App.initBackupInterface();
App.Music = function() {
  const musicButton = document.getElementById('musicToggleButton');
  if (musicButton) {
    // Récupérer la sauvegarde utilisateur
    const userData = getUserData();

    // Mettre à jour le texte du bouton en fonction de la valeur de userData.music
    // Si userData.music est false, le bouton affiche "Désactiver la musique"
    // Si userData.music est true, le bouton affiche "Activer la musique"
    if (userData.music === true) {
      musicButton.textContent = 'Désactiver la musique';
    } else {
      musicButton.textContent = 'Activer la musique';
    }

    // Lors d'un clic, on inverse le réglage et on recharge la fenêtre
    musicButton.addEventListener('click', function() {
      const userData = getUserData();
      if (!userData.music) {
        userData.music = true;
      } else {
        userData.music = false;
      }
      saveUserData(userData);
      location.reload();
    });
  }
}
App.Music();

