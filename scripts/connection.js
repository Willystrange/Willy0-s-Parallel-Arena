// On part du principe que le namespace App existe déjà
window.App = window.App || {};

// Initialisation de Firebase (uniquement pour AUTH)
App.firebaseConfig = window.firebaseConfig;
if (App.firebaseConfig && !firebase.apps.length) {
    firebase.initializeApp(App.firebaseConfig);
}
App.auth = firebase.auth();

// --- Gestion de l'état de connexion ---
App.saveConnectionState = function(userId, est_connecte) {
  localStorage.setItem('connection', JSON.stringify({ userid: userId, est_connecte }));
};

// --- Sauvegarde et chargement des données utilisateur via SERVEUR LOCAL ---
App.saveUserDataToFirebase = async function(userId, extraData = {}) {
  const userData = getUserData();
  Object.assign(userData, extraData);

  const user = firebase.auth().currentUser;
  if (!user) return { success: false, error: "Non connecté" };
  
  try {
      const token = await user.getIdToken();
      if (!token) return { success: false, error: "Jeton manquant" };

      const response = await fetch(`/api/user/${userId}`, {
          method: 'POST',
          headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ userData })
      });
      const data = await response.json();
      if (data.success && data.userData) {
          localStorage.setItem('userData', JSON.stringify(data.userData));
          return { success: true };
      } else {
          return { success: false, error: data.error };
      }
  } catch (e) {
      console.error('Erreur sauvegarde serveur local:', e);
      return { success: false, error: "Erreur de connexion au serveur." };
  }
};

App.loadUserDataFromFirebase = async function(userId) {
  const user = firebase.auth().currentUser;
  if (!user) return;
  try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/user/${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success && data.userData) {
          localStorage.setItem('userData', JSON.stringify(data.userData));
      }
  } catch (e) {
      console.error('Erreur chargement serveur local:', e);
  }
};

// --- Gestion de l'authentification ---
App.login = function() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  App.auth.signInWithEmailAndPassword(email, password)
    .then(async (userCredential) => {
      const user = userCredential.user;
      await App.loadUserDataFromFirebase(user.uid);
      // Lier l'email au compte serveur pour les passkeys
      await App.saveUserDataToFirebase(user.uid, { email: user.email });
      App.saveConnectionState(user.uid, true);
      setTimeout(() => loadPage('menu_principal'), 500);
    })
    .catch((error) => {
      alert('Erreur de connexion : ' + error.message);
    });
};

App.loginWithPasskey = async function() {
    console.log("[PASSKEY] Tentative de connexion lancée...");
    const email = document.getElementById('email').value;
    if (!email) return alert("Veuillez saisir votre email pour utiliser votre Passkey.");

    if (!window.isSecureContext || !navigator.credentials) {
        return alert("Les Passkeys ne sont disponibles que via une connexion sécurisée (HTTPS ou localhost).");
    }

    try {
        const optionsRes = await fetch('/api/passkey/login-options', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const options = await optionsRes.json();
        if (options.error) throw new Error(options.error);

        options.challenge = App.base64ToBuffer(options.challenge);
        if (options.allowCredentials) {
            options.allowCredentials = options.allowCredentials.map(c => ({
                ...c,
                id: App.base64ToBuffer(c.id)
            }));
        }

        const assertion = await navigator.credentials.get({ publicKey: options });
        const body = {
            id: assertion.id,
            rawId: App.bufferToBase64(assertion.rawId),
            response: {
                authenticatorData: App.bufferToBase64(assertion.response.authenticatorData),
                clientDataJSON: App.bufferToBase64(assertion.response.clientDataJSON),
                signature: App.bufferToBase64(assertion.response.signature),
                userHandle: assertion.response.userHandle ? App.bufferToBase64(assertion.response.userHandle) : null,
            },
            type: assertion.type,
        };

        const verifyRes = await fetch('/api/passkey/login-verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, body })
        });
        const result = await verifyRes.json();

        if (result.success) {
            localStorage.setItem('userData', JSON.stringify(result.userData));
            App.saveConnectionState(result.userId, true);
            alert(`Bon retour, ${result.userData.pseudo} !`);
            loadPage('menu_principal');
        } else {
            alert("Erreur Passkey : " + result.error);
        }
    } catch (err) {
        console.error(err);
        alert("Erreur de connexion Passkey : " + err.message);
    }
};

App.register = async function() {
  const pseudo = document.getElementById('registerPseudo').value.trim();
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;

  if (!pseudo || pseudo.length > 13) { alert("Pseudo invalide (1-13 car.)."); return; }

  try {
      const checkRes = await fetch(`/api/check-pseudo/${encodeURIComponent(pseudo)}`);
      const checkData = await checkRes.json();
      if (!checkData.available) {
          alert("Désolé, ce pseudo est déjà utilisé.");
          return;
      }

      const userCredential = await App.auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      const result = await App.saveUserDataToFirebase(user.uid, { pseudo: pseudo, email: email });
      
      if (result.success) {
          App.saveConnectionState(user.uid, true);
          loadPage('menu_principal');
      } else {
          alert("Erreur serveur : " + result.error);
          App.auth.signOut();
      }
  } catch (error) {
      alert('Erreur : ' + error.message);
  }
};

App.googleSignIn = function() {
  const provider = new firebase.auth.GoogleAuthProvider();
  App.auth.signInWithPopup(provider)
    .then(async (result) => {
      const user = result.user;
      const token = await user.getIdToken();
      const response = await fetch(`/api/user/${user.uid}`, {
          headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success && data.userData) {
          localStorage.setItem('userData', JSON.stringify(data.userData));
          await App.saveUserDataToFirebase(user.uid, { email: user.email });
      } else {
          let pseudo = null;
          let isValid = false;
          while (!isValid) {
              pseudo = prompt("Bienvenue ! Choisissez un pseudo (max 13 car.) :");
              if (!pseudo) { App.auth.signOut(); return; }
              pseudo = pseudo.trim();
              if (pseudo.length > 0 && pseudo.length <= 13) {
                  const createResult = await App.saveUserDataToFirebase(user.uid, { pseudo: pseudo, email: user.email });
                  if (createResult.success) isValid = true;
                  else alert("Erreur : " + createResult.error);
              } else alert("Pseudo invalide.");
          }
      }
      App.saveConnectionState(user.uid, true);
      loadPage('menu_principal');
    })
    .catch((error) => alert('Erreur Google : ' + error.message));
};

App.showForm = function(formId) {
  document.getElementById('loginForm').classList.add('hidden');
  document.getElementById('registerForm').classList.add('hidden');
  document.getElementById(formId).classList.remove('hidden');
};
App.showLoginForm = () => App.showForm('loginForm');
App.showRegisterForm = () => App.showForm('registerForm');

// --- CONDITIONAL UI (AUTOFILL PASSKEY) ---
App.initConditionalUI = async function() {
    // 1. Vérification de la compatibilité
    if (!window.isSecureContext || !navigator.credentials || !window.PublicKeyCredential) return;
    
    // Si la Conditional UI n'est pas dispo, on ne fait rien (le bouton a été supprimé)
    const isConditionalAvailable = await PublicKeyCredential.isConditionalMediationAvailable?.();
    if (!isConditionalAvailable) return;

    try {
        // 2. Récupération des options pour le flux "usernameless"
        const res = await fetch('/api/passkey/login-options', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}) // Corps vide = Mode Conditional UI
        });
        const options = await res.json();
        if (options.error) return; // Pas grave, on échoue silencieusement

        // Conversion du challenge (Base64 -> Buffer)
        options.challenge = App.base64ToBuffer(options.challenge);
        
        // 3. Appel à l'API WebAuthn avec mediation: 'conditional'
        // Cela ne déclenche PAS de popup immédiate, mais attend que l'utilisateur clique sur le champ input
        
        // Indicateur visuel de succès (Debug)
        const h1 = document.querySelector('#loginForm h1');
        if(h1) h1.innerHTML = "Connexion 🟢"; 

        // Force le focus pour afficher le prompt du navigateur si ce n'est pas déjà fait
        setTimeout(() => {
            const emailInput = document.getElementById('email');
            if (emailInput) emailInput.focus();
        }, 300); // Délai légèrement augmenté pour être sûr que le DOM est prêt et l'API WebAuthn active

        const assertion = await navigator.credentials.get({
            publicKey: options,
            mediation: 'conditional'
        });

        if (!assertion) return;

        console.log("[PASSKEY] Conditional UI: Credential reçu !", assertion);

        // 4. Vérification finale
        const body = {
            id: assertion.id,
            rawId: App.bufferToBase64(assertion.rawId),
            response: {
                authenticatorData: App.bufferToBase64(assertion.response.authenticatorData),
                clientDataJSON: App.bufferToBase64(assertion.response.clientDataJSON),
                signature: App.bufferToBase64(assertion.response.signature),
                userHandle: assertion.response.userHandle ? App.bufferToBase64(assertion.response.userHandle) : null,
            },
            type: assertion.type,
        };

        const verifyRes = await fetch('/api/passkey/login-verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                body: body,
                tempId: options.tempId // On renvoie l'ID temporaire pour retrouver le challenge
            })
        });
        const result = await verifyRes.json();

        if (result.success) {
            localStorage.setItem('userData', JSON.stringify(result.userData));
            App.saveConnectionState(result.userId, true);
            alert(`Bon retour, ${result.userData.pseudo} !`);
            loadPage('menu_principal');
        } else {
            console.error("Erreur Conditional UI:", result.error);
        }

    } catch (err) {
        // Les erreurs d'annulation ou de timeout sont normales ici
        console.warn("Conditional UI info:", err);
    }
};

// Lancement automatique
App.initConditionalUI();