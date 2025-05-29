// scripts/maintenance.js

(function() {
  const infoEl = document.getElementById('maintenance-info');
  const db = firebase.database();
  let maintenanceStart = null;
  let maintenanceEnd = null;

  function fetchMaintenanceTimes() {
    return Promise.all([
      db.ref('maintenance/start').once('value'),
      db.ref('maintenance/end').once('value')
    ]).then(([startSnap, endSnap]) => {
      maintenanceStart = new Date(startSnap.val());
      maintenanceEnd   = new Date(endSnap.val());
      const now = new Date();

      // si hors fenêtre de maintenance, on recharge pour quitter la page
      if (now < maintenanceStart || now > maintenanceEnd) {
        location.reload();
      }
    });
  }

  function updateCountdown() {
    if (!(maintenanceStart && maintenanceEnd)) {
      // en attente du premier fetch
      return;
    }
    const now = new Date();
    if (now < maintenanceStart || now > maintenanceEnd) {
      location.reload();
      return;
    }
    let diff = maintenanceEnd - now;
    if (diff < 0) {
      location.reload();
      return;
    }

    const days = Math.floor(diff / 86400000);
    diff %= 86400000;
    const hours = Math.floor(diff / 3600000);
    diff %= 3600000;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    const parts = [];
    if (days   ) parts.push(`${days}j`);
    if (hours  ) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    infoEl.textContent = `Fin de la maintenance dans : ${parts.join(' ')}`;
  }

  function init() {
    fetchMaintenanceTimes()
      .then(() => {
        // première mise à jour immédiate
        updateCountdown();
        // puis chaque seconde
        setInterval(updateCountdown, 1000);
        // re-fetch tous les 10 s pour capter tout changement
        setInterval(fetchMaintenanceTimes, 10000);
      })
      .catch(err => {
        console.error(err);
        infoEl.textContent = 'Erreur de chargement des horaires de maintenance.';
      });
  }

  // si le DOM est déjà prêt, on init tout de suite
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
