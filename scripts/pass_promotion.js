// Ce fichier est chargé dynamiquement par loadPage.
// Il déclenche la traduction de la page de promotion du pass.

(function() {
    console.log("Pass promotion script executed.");
    if (window.App && App.translatePage) {
        if (App.translations && Object.keys(App.translations).length > 0) {
            App.translatePage();
        } else {
            window.addEventListener('translationsLoaded', App.translatePage, { once: true });
            setTimeout(App.translatePage, 500);
        }
    }
})();