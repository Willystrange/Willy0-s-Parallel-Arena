// On part du principe que le namespace App existe déjà
window.App = window.App || {};

// Initialisation de Firebase
App.firebaseConfig = firebaseConfig;
App.firebaseApp = firebase.initializeApp(App.firebaseConfig);
App.auth = firebase.auth();
App.database = firebase.database();

// --- Gestion de l'état de connexion ---
App.saveConnectionState = function(userId, est_connecte) {
  localStorage.setItem('connection', JSON.stringify({ userid: userId, est_connecte }));
};

// --- Sauvegarde et chargement des données utilisateur ---
App.saveUserDataToFirebase = function(userId) {
  const userData = getUserData();
  const userRef = App.database.ref(`users/${userId}/userData`);

  userRef.set(userData, (error) => {
    if (error) {
      console.error('Erreur lors de l\'enregistrement dans Firebase:', error);
    } else {
      console.log('Données utilisateur sauvegardées dans Firebase');
    }
  });
};

App.loadUserDataFromFirebase = function(userId) {
  const userRef = App.database.ref(`users/${userId}`);

  userRef.once('value', (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const userData = data.userData || {};

      localStorage.setItem('userData', JSON.stringify(userData));
      console.log('Données utilisateur récupérées depuis Firebase');
    } else {
      console.log('Aucune donnée utilisateur trouvée dans Firebase');
    }
  });
};

// --- Gestion de l'authentification ---
App.login = function() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  App.auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      console.log('Utilisateur connecté:', user);

      App.loadUserDataFromFirebase(user.uid);
      App.saveConnectionState(user.uid, true);

      // Navigation vers le menu principal (SPA)
      setTimeout(() => {
        loadPage('menu_principal');
      }, 2000);
    })
    .catch((error) => {
      console.error('Erreur de connexion:', error.message);
      alert('Erreur de connexion : ' + error.message);
    });
};

App.register = function() {
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;

  App.auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      console.log('Utilisateur inscrit:', user);

      App.saveUserDataToFirebase(user.uid);
      App.saveConnectionState(user.uid, true);

      // Navigation vers le menu principal (SPA)
      loadPage('menu_principal');
    })
    .catch((error) => {
      console.error('Erreur d\'inscription:', error.message);
      alert('Erreur d\'inscription : ' + error.message);
    });
};

App.googleSignIn = function() {
  const provider = new firebase.auth.GoogleAuthProvider();
  App.auth.signInWithPopup(provider)
    .then((result) => {
      const user = result.user;
      console.log('Utilisateur connecté avec Google:', user);

      const userRef = App.database.ref(`users/${user.uid}`);
      userRef.once('value', (snapshot) => {
        if (snapshot.exists()) {
          App.loadUserDataFromFirebase(user.uid);
        } else {
          App.saveUserDataToFirebase(user.uid);
        }

        App.saveConnectionState(user.uid, true);
        loadPage('menu_principal');
      });
    })
    .catch((error) => {
      console.error('Erreur de connexion avec Google:', error.message);
      alert('Erreur de connexion avec Google : ' + error.message);
    });
};

// --- Gestion de l'affichage des formulaires ---
App.showForm = function(formId) {
  document.getElementById('loginForm').classList.add('hidden');
  document.getElementById('registerForm').classList.add('hidden');
  document.getElementById(formId).classList.remove('hidden');
};

App.showLoginForm = function() {
  App.showForm('loginForm');
};

App.showRegisterForm = function() {
  App.showForm('registerForm');
};
