// On part du principe que le namespace App existe déjà
window.App = window.App || {};

if (window.firebaseConfig && !firebase.apps.length) {
    firebase.initializeApp(window.firebaseConfig);
}

// Helper pour les traductions des paramètres
App.t_settings = function(key, params = {}) {
    if (!App.localization || !App.localization.settings) return null;
    let val = App.localization.settings;
    const keys = key.split('.');
    for (const k of keys) {
        val = val[k];
        if (!val) return null;
    }
    if (typeof val === 'string') {
        Object.keys(params).forEach(p => val = val.replace(`{${p}}`, params[p]));
        return val;
    }
    return null;
};

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
  App.renderAdminButton();
};

App.renderAdminButton = function() {
  const userData = getUserData();
  const container = document.querySelector('.container');
  const logoutButton = document.getElementById('logoutButton');
  
  // Nettoyage ancien bouton si existant (pour éviter doublons lors re-render)
  const oldBtn = document.getElementById('adminPortalButton');
  if (oldBtn) oldBtn.remove();

  if (userData.isAdmin && container) {
    const adminBtn = document.createElement('a');
    adminBtn.id = 'adminPortalButton';
    adminBtn.className = 'button';
    adminBtn.style.background = 'linear-gradient(135deg, #6200ee, #bb86fc)';
    adminBtn.style.color = 'white';
    adminBtn.style.fontWeight = 'bold';
    adminBtn.innerText = App.t_settings('admin_portal') || '🛠️ Portail Administrateur';
    adminBtn.onclick = () => window.location.href = 'admin.html';
    
    // Insérer avant le bouton de déconnexion ou à la fin
    if (logoutButton && logoutButton.parentNode === container) {
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
    if (!user) return alert(App.t_settings('alerts.connect_first') || "Connectez-vous d'abord");

    // Vérification du support Navigateur + Contexte Sécurisé (HTTPS/Localhost)
    if (!window.isSecureContext || !navigator.credentials) {
        return alert(App.t_settings('alerts.browser_unsupported') || "Votre navigateur ou votre connexion (non-HTTPS) ne permet pas l'utilisation des Passkeys.");
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
            alert(App.t_settings('alerts.passkey_success') || "Passkey ajoutée avec succès ! Vous pouvez maintenant vous connecter sans mot de passe.");
        } else {
            alert(App.t_settings('alerts.passkey_failure') || "Échec de l'enregistrement de la Passkey.");
        }
    } catch (err) {
        console.error(err);
        // Gestion spécifique de l'erreur "Déjà enregistré" (InvalidStateError)
        if (err.name === 'InvalidStateError' || err.message.includes('The object is in an invalid state')) {
            alert(App.t_settings('alerts.passkey_exists') || "Vous avez déjà une Passkey active sur cet appareil.");
        } else {
            alert((App.t_settings('alerts.passkey_error', {error: err.message}) || "Erreur lors de la création de la Passkey : " + err.message));
        }
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
    version: App.game_version,
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
  alert(App.t_settings('alerts.backup_updated') || 'Mise à jour de la sauvegarde effectuée.');
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
        alert((App.t_settings('alerts.logout_error', {error: error.message}) || 'Erreur lors de la déconnexion : ' + error.message));
    });
  } else {
    alert(App.t_settings('alerts.no_user') || "Aucun utilisateur n'est connecté.");
  }
};

/* ---------- Initialisation de l'interface Backup ---------- */
App.renderSettingsUI = function() {
    const userData = getUserData();

    // 1. Langue
    const languageCheckbox = document.getElementById('languageToggleCheckbox');
    if (languageCheckbox) {
        languageCheckbox.checked = (userData.language === 'en');
    }

    // 2. Musique
    const musicCheckbox = document.getElementById('musicToggleCheckbox');
    const volumeContainer = document.getElementById('volumeContainer');
    if (musicCheckbox) {
        musicCheckbox.checked = !!userData.music;
        if (volumeContainer) {
            volumeContainer.style.display = userData.music ? 'block' : 'none';
        }
    }

    // 3. Swipe Navigation
    const swipeCheckbox = document.getElementById('swipeToggleCheckbox');
    if (swipeCheckbox) {
        // Default is true if undefined
        swipeCheckbox.checked = (userData.swipeNavigation !== false);
    }

    // 4. Info Version
    const versionInfo = document.getElementById('versionInfo');
    if (versionInfo) {
        const vUnavailable = App.t_settings('alerts.version_unavailable') || 'Version non disponible';
        versionInfo.textContent = userData.version ? 'v.' + userData.version : vUnavailable;
    }

    // 5. Bouton Admin
    App.renderAdminButton();
};

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

  // Gestion de la Langue (Toggle)
  const languageCheckbox = document.getElementById('languageToggleCheckbox');
  if (languageCheckbox) {
      languageCheckbox.addEventListener('change', async (e) => {
          const userData = getUserData();
          const next = e.target.checked ? 'en' : 'fr';
          
          userData.language = next;
          localStorage.setItem('userData', JSON.stringify(userData));
          
          if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
              const user = firebase.auth().currentUser;
              if (user && window.App && typeof App.saveUserDataToFirebase === 'function') {
                  try {
                      await App.saveUserDataToFirebase(user.uid);
                  } catch(e) { console.error("Erreur sauvegarde langue serveur:", e); }
              }
          }
          
          if (next !== 'fr') {
              alert(App.t_settings('alerts.beta_warning') || "⚠️ Attention : La version anglaise est en Bêta.");
          }
          
          location.reload();
      });
  }

  // Gestion de la Musique (Toggle)
  const musicCheckbox = document.getElementById('musicToggleCheckbox');
  if (musicCheckbox) {
      musicCheckbox.addEventListener('change', (e) => {
          const userData = getUserData();
          userData.music = e.target.checked;
          saveUserData(userData);
          
          const volumeContainer = document.getElementById('volumeContainer');
          if (volumeContainer) {
              volumeContainer.style.display = userData.music ? 'block' : 'none';
          }
          
          // Use dynamic toggle instead of reload
          if (typeof App.toggleMusic === 'function') {
              App.toggleMusic(userData.music);
          }
      });
  }

  // Gestion du Swipe (Toggle)
  const swipeCheckbox = document.getElementById('swipeToggleCheckbox');
  if (swipeCheckbox) {
      swipeCheckbox.addEventListener('change', (e) => {
          const userData = getUserData();
          userData.swipeNavigation = e.target.checked;
          saveUserData(userData);
          
          // Apply changes immediately
          if (typeof App.updateSwipeState === 'function') {
              App.updateSwipeState();
          }
      });
  }

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
  
  // Rendu initial des textes dynamiques
  App.renderSettingsUI();
}

// Nettoyage de l'event listener précédent pour éviter les fuites/doublons lors du rechargement du script
if (App.onTranslationsLoadedSettings) {
    window.removeEventListener('translationsLoaded', App.onTranslationsLoadedSettings);
}
App.onTranslationsLoadedSettings = function() {
    App.renderSettingsUI();
};
window.addEventListener('translationsLoaded', App.onTranslationsLoadedSettings);


App.initBackupInterface();
