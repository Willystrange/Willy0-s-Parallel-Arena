importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js");

// Initialisation Firebase
firebase.initializeApp({
    apiKey: "TA_CLE_API",
    authDomain: "TON_PROJET.firebaseapp.com",
    projectId: "TON_PROJET",
    storageBucket: "TON_PROJET.appspot.com",
    messagingSenderId: "TON_SENDER_ID",
    appId: "TON_APP_ID"
});

// Récupérer Firebase Messaging
const messaging = firebase.messaging();

// Gérer les notifications en arrière-plan
messaging.onBackgroundMessage((payload) => {
    console.log("📢 Notification reçue en arrière-plan :", payload);
    self.registration.showNotification(payload.notification.title, {
        body: payload.notification.body,
        icon: payload.notification.icon
    });
});
