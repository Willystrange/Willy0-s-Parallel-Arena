// On part du principe que le namespace App existe déjà
window.App = window.App || {};

if (window.firebaseConfig && !firebase.apps.length) {
    firebase.initializeApp(window.firebaseConfig);
}

firebase.auth().onAuthStateChanged(user => {
  if (user) {
    App.User = true;
    App.userId = user.uid;
    // S'assurer que userData existe
    let currentUserData = getUserData();
    saveUserData(currentUserData);
  } else {
  }
});

/* ---------- Mise à jour de l'interface ---------- */
App.updateUIP = function() {
  const loginButton = document.getElementById('loginButton');
  if (loginButton) {
    loginButton.style.display = App.User ? 'none' : 'block';
  }
  const logoutButton = document.getElementById('logoutButton');
  if (logoutButton) {
    logoutButton.style.display = App.User ? 'block' : 'none';
  }
  const addPasskeyButton = document.getElementById('addPasskeyButton');
  if (addPasskeyButton) {
    addPasskeyButton.style.display = App.User ? 'block' : 'none';
  }

  // Ajout du bouton Admin si l'utilisateur est administrateur
  const userData = getUserData();
  const container = document.querySelector('.container');
  if (userData.isAdmin && container && !document.getElementById('adminPortalButton')) {
    const adminBtn = document.createElement('a');
    adminBtn.id = 'adminPortalButton';
    adminBtn.className = 'button';
    adminBtn.style.background = 'linear-gradient(135deg, #6200ee, #bb86fc)';
    adminBtn.style.color = 'white';
    adminBtn.style.fontWeight = 'bold';
    adminBtn.innerText = '🛠️ Portail Administrateur';
    adminBtn.onclick = () => window.location.href = 'admin.html';
    
    // Insérer avant le bouton de déconnexion ou à la fin
    if (logoutButton) {
        container.insertBefore(adminBtn, logoutButton);
    } else {
        container.appendChild(adminBtn);
    }
  }
};

firebase.auth().onAuthStateChanged(() => App.updateUIP());

/* ---------- Passkey Logic ---------- */
App.registerPasskey = async function() {
    const user = firebase.auth().currentUser;
    if (!user) return alert("Connectez-vous d'abord");

    // Vérification du support Navigateur + Contexte Sécurisé (HTTPS/Localhost)
    if (!window.isSecureContext || !navigator.credentials) {
        return alert("Votre navigateur ou votre connexion (non-HTTPS) ne permet pas l'utilisation des Passkeys.");
    }

    try {
        const token = await user.getIdToken();
        
        // 1. Obtenir les options du serveur
        const optionsRes = await fetch('/api/passkey/register-options', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const options = await optionsRes.json();

        // 2. Conversion des données binaires pour le navigateur
        options.challenge = App.base64ToBuffer(options.challenge);
        options.user.id = App.base64ToBuffer(options.user.id);

        if (options.excludeCredentials) {
            options.excludeCredentials.forEach(cred => {
                cred.id = App.base64ToBuffer(cred.id);
            });
        }

        // 3. Appel à l'API du navigateur
        const credential = await navigator.credentials.create({ publicKey: options });

        // 4. Conversion de la réponse pour l'envoi au serveur
        const body = {
            id: credential.id,
            rawId: App.bufferToBase64(credential.rawId),
            response: {
                attestationObject: App.bufferToBase64(credential.response.attestationObject),
                clientDataJSON: App.bufferToBase64(credential.response.clientDataJSON),
                transports: credential.getTransports ? credential.getTransports() : [],
            },
            type: credential.type,
        };

        // 5. Vérification finale sur le serveur
        const verifyRes = await fetch('/api/passkey/register-verify', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                body,
                email: user.email // ON AJOUTE L'EMAIL ICI
            })
        });

        if ((await verifyRes.json()).success) {
            alert("Passkey ajoutée avec succès ! Vous pouvez maintenant vous connecter sans mot de passe.");
        } else {
            alert("Échec de l'enregistrement de la Passkey.");
        }
    } catch (err) {
        console.error(err);
        alert("Erreur lors de la création de la Passkey : " + err.message);
    }
};

/* ---------- Actions sur les sauvegardes ---------- */
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
    version: 'B2.2.1.20',
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
    Paradoxe: 0,
    Paradoxe_XP: 0,
    Paradoxe_Level: 1,
    Paradoxe_boost: 0,
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
// Firebase Auth est déjà initialisé globalement
App.auth = firebase.auth();

App.logout = async function() {
  const userData = getUserData();
  if (App.auth.currentUser) {
    const userId = App.auth.currentUser.uid;
    // On sauvegarde une dernière fois sur le serveur local
    try {
        await fetch(`/api/user/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userData })
        });
    } catch (e) {}

    App.auth.signOut().then(() => {
      localStorage.removeItem('connection');
      localStorage.removeItem('userData');
      window.location.reload();
    }).catch(error => {
        alert('Erreur lors de la déconnexion : ' + error.message);
    });
  } else {
    alert("Aucun utilisateur n'est connecté.");
  }
};

/* ---------- Initialisation de l'interface Backup ---------- */
App.initBackupInterface = function() {
  document.getElementById('updateBackup').addEventListener('click', App.updateBackup);
  const addPasskeyBtn = document.getElementById('addPasskeyButton');
  if (addPasskeyBtn) addPasskeyBtn.onclick = App.registerPasskey;
  document.getElementById('contactDev').addEventListener('click', () => {
    loadPage('feed-back');
  });
  document.getElementById('logoutButton').addEventListener('click', (e) => {
    e.preventDefault();
    App.logout();
  });

  // Gestion du volume
  const volumeSlider = document.getElementById('volumeSlider');
  if (volumeSlider) {
    const userData = getUserData();
    volumeSlider.value = userData.musicVolume !== undefined ? userData.musicVolume : 0.5;
    volumeSlider.addEventListener('input', (e) => {
      if (typeof App.setMusicVolume === 'function') {
        App.setMusicVolume(e.target.value);
      }
    });
  }

  // Mise à jour de l'interface et affichage de la version
  App.updateUIP();
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

