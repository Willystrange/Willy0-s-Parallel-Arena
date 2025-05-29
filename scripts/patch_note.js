// On part du principe que le namespace App existe déjà
window.App = window.App || {};

// --- Gestion de la navigation et démarrage de la partie ---
App.startGameIfStarted = function() {
    const userData = getUserData();
    if (userData.partie_commencee) {
        loadPage('combat');
    } else if (userData.partie_commencee_weekend) {
        loadPage('combat-weekend');
    }
};
App.startGameIfStarted();

// --- Gestion des clics sur les titres via délégation d'événements ---
App.handleVersionClick = function(event) {
    const target = event.target;
    if (target.matches('h1[id^="version-"]')) {
        const version = target.id.split('-').pop();
        const notes = document.getElementById(`notes-${version}`);

        if (!notes) {
            console.error(`Élément avec l'id notes-${version} non trouvé.`);
            return;
        }

        if (notes.classList.contains('open')) {
            notes.classList.remove('open');
        } else {
            document.querySelectorAll('.note-list.open').forEach(list => list.classList.remove('open'));
            notes.classList.add('open');
        }
    }
};

// Attacher l'événement après le chargement du DOM

    document.addEventListener('click', App.handleVersionClick)
