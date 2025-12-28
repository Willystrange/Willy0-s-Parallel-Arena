// scripts/maintenance.js

(function() {
  const infoEl = document.getElementById('maintenance-info');

  async function checkMaintenance() {
    try {
        const response = await fetch('/api/config/maintenance');
        const data = await response.json();
        if (!data.maintenance) {
            location.reload();
        }
    } catch (e) {}
  }

  function init() {
    infoEl.textContent = 'Le serveur est en cours de maintenance.';
    setInterval(checkMaintenance, 30000);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();