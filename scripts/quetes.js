window.App = window.App || {};

// --- Navigation et démarrage de la partie ---
App.startGameIfStarted = () => {
  const userData = getUserData();
  if (userData.partie_commencee) loadPage('combat');
  else if (userData.partie_commencee_weekend) loadPage('combat-weekend');
};
App.startGameIfStarted();

// --- CONFIGURATION DES RÉCOMPENSES ---
App.DAILY_REWARD_AMOUNT = 15;
App.WEEK_REWARD_AMOUNT = 20;

// --- FONCTIONS UTILITAIRES ---
App.CHARACTERS = ['Willy', 'Cocobi', 'Sboonie', 'Rosalie', 'Poulpy', 'Inconnu', 'Diva', 'Colorina', 'Grours', 'Oiseau', 'Baleine', 'Doudou', 'Coeur'];

App.getRandomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

App.getRandomElements = (arr, count) => {
  const shuffled = arr.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
};

App.updateProgressBar = (barEl, textEl, total, current) => {
  const percentage = (current / total) * 100;
  barEl.style.width = percentage + '%';
  textEl.textContent = current >= total ? 'Quête terminée' : `${current} / ${total}`;
};

// --- GESTION DES QUÊTES QUOTIDIENNES ---
App.assignRandomQuest = () => {
  const userData = getUserData();
  const questContainer = document.getElementById('daily-quests');
  if (!questContainer) return;
  const questIds = ['quete1', 'quete2', 'quete3'];

  if (userData.quetes_jour === true) {
    let allQuestsCompleted = true;
    questIds.forEach(id => {
      const questElement = document.getElementById(id);
      if (userData[`${id}_text`]) {
        const questText = userData[`${id}_text`];
        const questTotal = userData[`${id}_total`];
        const questCurrent = userData[`${id}_current`];
        // Assure que la récompense est définie
        if (!userData[`${id}_reward`]) {
          userData[`${id}_reward`] = App.DAILY_REWARD_AMOUNT;
        }
        if (questCurrent >= questTotal) {
          if (!userData[`${id}_completed`]) {
            userData.argent = (userData.argent || 0) + App.DAILY_REWARD_AMOUNT;
            alert(`Quête ${questText} terminée : +${App.DAILY_REWARD_AMOUNT} argent`);
            userData[`${id}_completed`] = true;
          }
          questElement.innerHTML = `
          <li>
            <p>${questText}</p>
            <p class="reward-info">Récompense : ${App.DAILY_REWARD_AMOUNT} Points</p>
            <div class="progress-bar-container">
              <div class="progress-bar" id="${id}-bar"></div>
              <div class="progress-bar-text" id="${id}-text">Quête terminée</div>
            </div>
          </li>
          `;
        } else {
          allQuestsCompleted = false;
          questElement.innerHTML = `
          <li>
            <p>${questText}</p>
            <p class="reward-info">Récompense : ${App.DAILY_REWARD_AMOUNT} Points</p>
            <div class="progress-bar-container">
              <div class="progress-bar" id="${id}-bar"></div>
              <div class="progress-bar-text" id="${id}-text">${questCurrent} / ${questTotal}</div>
            </div>
            </li>
          `;
        }
        const barEl = document.getElementById(`${id}-bar`);
        const textEl = document.getElementById(`${id}-text`);
        if (barEl && textEl) App.updateProgressBar(barEl, textEl, questTotal, questCurrent);
      }
    });
    saveUserData(userData);
    return;
  }
  userData.quetes_jour = true;
  const availableQuests = [];
  const unlockedCharacters = App.CHARACTERS.filter(c => userData[c] === 1);

  if (unlockedCharacters.length > 0) {
    const randomCharacter = unlockedCharacters[
      Math.floor(Math.random() * unlockedCharacters.length)
    ];
    const randomWins = App.getRandomNumber(3, 5);
    availableQuests.push({
      text: `Gagner ${randomWins} parties avec ${randomCharacter}.`,
      total: randomWins,
      current: 0,
      type: 'victoire_classique',
      character: randomCharacter
    });
  }

  const dmgTarget = App.getRandomNumber(30000, 70000);
  availableQuests.push({
    text: `Infliger ${dmgTarget} points de dégâts en mode classique.`,
    total: dmgTarget,
    current: 0,
    type: 'dommages_classique'
  });

  const objTarget = App.getRandomNumber(3, 10);
  availableQuests.push({
    text: `Utiliser ${objTarget} objets.`,
    total: objTarget,
    current: 0,
    type: 'objets_total'
  });

  const survTarget = App.getRandomNumber(5, 12);
  availableQuests.push({
    text: `Survivre à ${survTarget} manches en mode survie.`,
    total: survTarget,
    current: 0,
    type: 'manches_survie'
  });

  const defTarget = App.getRandomNumber(5, 12);
  availableQuests.push({
    text: `Se défendre ${defTarget} fois en mode classique.`,
    total: defTarget,
    current: 0,
    type: 'defense_classique'
  });

  const dailyQuests = App.getRandomElements(availableQuests, 3);
  dailyQuests.forEach((quest, idx) => {
    const id = questIds[idx];
    Object.assign(userData, {
      [`${id}_text`]: quest.text,
      [`${id}_total`]: quest.total,
      [`${id}_current`]: quest.current,
      [`${id}_type`]: quest.type,
      [`${id}_completed`]: false,
      [`${id}_reward`]: App.DAILY_REWARD_AMOUNT
    });
    if (quest.character) userData[`${id}_character`] = quest.character;
    const questElement = document.getElementById(id);
    if (questElement) {
      questElement.innerHTML = `
      <li>
        <p>${quest.text}</p>
        <p class="reward-info">Récompense : ${App.DAILY_REWARD_AMOUNT} Points</p>
        <div class="progress-bar-container">
          <div class="progress-bar" id="${id}-bar"></div>
          <div class="progress-bar-text" id="${id}-text">${quest.current} / ${quest.total}</div>
        </div>
        </li>
      `;
      const barEl = document.getElementById(`${id}-bar`);
      const textEl = document.getElementById(`${id}-text`);
      if (barEl && textEl) App.updateProgressBar(barEl, textEl, quest.total, quest.current);
    }
  });
  saveUserData(userData);
};

// --- GESTION DES BARRIÈRES DE PROGRESSION ---
App.updateDailyProgressBar = (barId, total, current) => {
  const barEl = document.getElementById(barId);
  const textEl = document.getElementById(barId.replace('-bar', '-text'));
  if (barEl && textEl) App.updateProgressBar(barEl, textEl, total, current);
};

App.updateWeeklyProgressBar = (containerId, total, current) => {
  const container = document.getElementById(containerId);
  if (!container) return;
  const barEl = container.querySelector('.progress-bar');
  const textEl = container.querySelector('.progress-bar-text');
  if (barEl && textEl) App.updateProgressBar(barEl, textEl, total, current);
};

// --- GESTION DES QUÊTES HEBDOMADAIRES ---
App.generateWeeklyQuests = () => {
  const userData = getUserData();
  userData.quetes_genere = true;

  for (let week = 1; week <= 9; week++) {
    const availableQuests = [];
    const unlockedCharacters = App.CHARACTERS.filter(c => userData[c] === 1);

    if (unlockedCharacters.length > 0) {
      const char1 = unlockedCharacters[Math.floor(Math.random() * unlockedCharacters.length)];
      const winsWithChar = App.getRandomNumber(7, 15);
      availableQuests.push({
        text: `Gagner ${winsWithChar} parties avec ${char1} en mode classique.`,
        total: winsWithChar,
        current: 0,
        type: 'VPCS',
        character: char1
      });

      const char2 = unlockedCharacters[Math.floor(Math.random() * unlockedCharacters.length)];
      const survWithChar = App.getRandomNumber(14, 27);
      availableQuests.push({
        text: `Survivre ${survWithChar} manches en mode survie avec ${char2}.`,
        total: survWithChar,
        current: 0,
        type: 'SPS',
        character: char2
      });
    }

    const wins = App.getRandomNumber(8, 20);
    availableQuests.push({
      text: `Gagner ${wins} parties en mode classique.`,
      total: wins,
      current: 0,
      type: 'VCS'
    });

    const dmgClassic = App.getRandomNumber(100000, 500000);
    availableQuests.push({
      text: `Infliger ${dmgClassic} points de dégâts en mode classique.`,
      total: dmgClassic,
      current: 0,
      type: 'DSC'
    });

    const items = App.getRandomNumber(10, 20);
    availableQuests.push({
      text: `Utiliser ${items} objets.`,
      total: items,
      current: 0,
      type: 'O'
    });

    const survRounds = App.getRandomNumber(20, 40);
    availableQuests.push({
      text: `Survivre à ${survRounds} manches en mode survie.`,
      total: survRounds,
      current: 0,
      type: 'SS'
    });

    const defenses = App.getRandomNumber(20, 40);
    availableQuests.push({
      text: `Se défendre ${defenses} fois en mode classique.`,
      total: defenses,
      current: 0,
      type: 'DC'
    });

    const specialClassic = App.getRandomNumber(35, 60);
    availableQuests.push({
      text: `Utiliser ${specialClassic} capacités spéciales en mode classique.`,
      total: specialClassic,
      current: 0,
      type: 'CC'
    });

    const dmgSurvival = App.getRandomNumber(150000, 550000);
    availableQuests.push({
      text: `Infliger ${dmgSurvival} points de dégâts en mode survie.`,
      total: dmgSurvival,
      current: 0,
      type: 'DS'
    });

    const specialSurvival = App.getRandomNumber(35, 65);
    availableQuests.push({
      text: `Utiliser la capacité spéciale ${specialSurvival} fois en mode survie.`,
      total: specialSurvival,
      current: 0,
      type: 'CS'
    });

    const weeklyQuests = App.getRandomElements(availableQuests, 5);
    weeklyQuests.forEach((quest, idx) => {
      const id = `Semaine${week}_${idx + 1}`;
      Object.assign(userData, {
        [`${id}_text`]: quest.text,
        [`${id}_total`]: quest.total,
        [`${id}_current`]: quest.current,
        [`${id}_type`]: quest.type,
        [`${id}_completed`]: false,
        [`${id}_reward`]: "1 récompense aléatoire"
      });
      if (quest.character) {
        userData[`${id}_character`] = quest.character;
      }
    });
  }

  saveUserData(userData);
};


App.displayWeeklyQuests = () => {
  const userData = getUserData();
  const weeksContainer = document.getElementById('weeks');
  if (!weeksContainer) return;
  const currentWeekNumber = App.getCustomWeekNumber(new Date());
  let weeklyContent = '';

  for (let weekNumber = 1; weekNumber <= 9; weekNumber++) {
    if (!userData[`semaine${weekNumber}`]) continue;
    weeklyContent += `<div class="semaine"><h2>Semaine ${weekNumber}:</h2><ul class="quêtes">`;
    for (let i = 1; i <= 5; i++) {
      const questKey = `Semaine${weekNumber}_${i}`;
      const questText = userData[`${questKey}_text`] || '';
      const questTotal = userData[`${questKey}_total`] || 1;
      let questCurrent = userData[`${questKey}_current`] || 0;
      if (questCurrent >= questTotal) {
        userData[`${questKey}_completed`] = true;
        // On sauvegarde en dehors de la boucle interne pour éviter plusieurs écritures
      }
      const progressBarId = `week-${weekNumber}-quest-${i}`;
      weeklyContent += `<li>
        <p>${questText}</p>
        <p class="reward-info">Récompense : 1 récompense aléatoire et 200XP pour le Parallel Pass</p>
        <div class="progress-bar-container" id="${progressBarId}">
          <div class="progress-bar" style="width: ${(questCurrent / questTotal) * 100}%;"></div>
          <div class="progress-bar-text">${questCurrent >= questTotal ? 'Quête terminée' : `${questCurrent} / ${questTotal}`}</div>
        </div>
      </li>`;
      // Mise à jour optionnelle via updateWeeklyProgressBar si besoin d'un recalcul
      App.updateWeeklyProgressBar(progressBarId, questTotal, questCurrent);
    }
    weeklyContent += `</ul></div>`;
  }
  weeksContainer.innerHTML = weeklyContent;
  saveUserData(userData);
};

App.checkAndRewardQuestCompletion = (questKey, userData) => {
  if (userData[`${questKey}_completed`] && !userData[`${questKey}_rewardClaimed`]) {
    const questText = userData[`${questKey}_text`];
    userData.pass_XP = (userData.pass_XP || 0) + 200;
    userData.recompense = (userData.recompense || 0) + 1;
    alert(`Quête ${questText} terminée : +200XP pour le Parallel Pass et +1 récompense aléatoire`)
    userData[`${questKey}_rewardClaimed`] = true;
  }
};

App.checkAllQuestsCompletion = (userData) => {
  for (let week = 1; week <= 9; week++) {
    for (let i = 1; i <= 5; i++) {
      App.checkAndRewardQuestCompletion(`Semaine${week}_${i}`, userData);
    }
  }
  saveUserData(userData);
};

// --- NOUVEAUX CALCULS D’ÉCHÉANCE ---

// Retourne un objet Date pour demain à 09:00 (heure de Paris)
App.getNextDailyAtNine = () => {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const next = new Date(now);
  next.setDate(now.getDate() + 1);
  next.setHours(9, 0, 0, 0);
  return next;
};

// Retourne un objet Date pour le prochain lundi à 09:00 (heure de Paris)
App.getNextMondayAtNine = () => {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const day = now.getDay();           // 0=dimanche…6=samedi
  const daysToMonday = (8 - day) % 7; // si day=1 (lundi), → 0, sinon nombre de jours restant
  const next = new Date(now);
  next.setDate(now.getDate() + daysToMonday);
  next.setHours(9, 0, 0, 0);
  return next;
};

// (Le calcul pour les quêtes hebdomadaires reste App.getNextThursdayAtNine)

// --- MISE À JOUR DES MINUTEURS ---

App.formatDiff = (ms) => {
  const sec = Math.floor(ms / 1000) % 60;
  const min = Math.floor(ms / 1000 / 60) % 60;
  const hrs = Math.floor(ms / 1000 / 60 / 60) % 24;
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  return `${days}j ${hrs}h ${min}m ${sec}s`;
};

App.getNextSaturdayAtNine = () => {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const day = now.getDay();            // 0=dimanche…6=samedi
  const daysToSaturday = (6 - day + 7) % 7;
  const next = new Date(now);
  next.setDate(now.getDate() + daysToSaturday);
  next.setHours(9, 0, 0, 0);
  // si on est déjà passé aujourd’hui à 09h, on recule d’une semaine
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 7);
  }
  return next;
};

// Renvoie le prochain lundi à 09 h (heure de Paris)
App.getNextMondayAtNine = () => {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const next = new Date(now);
  // 1 = lundi
  next.setDate(now.getDate() + ((1 - now.getDay() + 7) % 7));
  next.setHours(9, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 7);
  return next;
};

// Renvoie le prochain vendredi à 09 h (heure de Paris)
App.getNextFridayAtNine = () => {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const next = new Date(now);
  // 5 = vendredi
  next.setDate(now.getDate() + ((5 - now.getDay() + 7) % 7));
  next.setHours(9, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 7);
  return next;
};


App.updateAllCountdowns = () => {
  const ids = ['daily-countdown', 'weekly-countdown', 'weekend-countdown', 'summer-countdown'];
  const anyVisible = ids.some(id => {
    const el = document.getElementById(id);
    return el && window.getComputedStyle(el).display !== 'none';
  });
  if (!anyVisible) {
    App.stopCountdowns();
    return;
  }

  const nowMs = Date.now();

  // — Quotidiennes —
  const nextDaily = App.getNextDailyAtNine().getTime();
  document.getElementById('daily-countdown').textContent =
    'Actualisation dans : ' + App.formatDiff(nextDaily - nowMs);

  // — Week-end / week-end suivant —
  const parisNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  let targetMs, label;

  if (App.isInWeekendPeriod(parisNow)) {
    // Pendant le week-end → jusqu’au lundi 09 h
    targetMs = App.getNextMondayAtNine().getTime();
    label = 'Suppression des quêtes dans : ';
  } else {
    // Hors week-end → jusqu’au vendredi 09 h
    targetMs = App.getNextFridayAtNine().getTime();
    label = 'Nouvelles quêtes dans : ';
  }

  document.getElementById('weekend-countdown').textContent =
    label + App.formatDiff(targetMs - nowMs);

  // — Hebdomadaires (jeudi 09 h) —
  const nextThu = App.getNextThursdayAtNine().getTime();
  document.getElementById('weekly-countdown').textContent =
    'Prochaines quêtes dans : ' + App.formatDiff(nextThu - nowMs);
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.paddingLeft = '3%';
  });

};




App.getCustomWeekNumber = (date) => {
  const startDate = new Date('2025-07-16T07:00:00Z'); // 9h en France (UTC+1 en hiver)
  const diff = date - startDate;
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return ((Math.ceil(diff / oneWeek) - 1) % 5) + 1;
};

App.stopCountdowns = function() {
  if (App.countdownId !== null) {
    clearInterval(App.countdownId);
    App.countdownId = null;
  }
}

// --- COMPTE À REBOURS ET ACTUALISATION DES STATUTS ---
App.getNextThursdayAtNine = () => {
  const now = new Date();
  let nextThursday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  nextThursday.setDate(now.getDate() + ((4 - now.getDay() + 7) % 7));
  nextThursday.setHours(9, 0, 0, 0);
  if (nextThursday <= now) nextThursday.setDate(nextThursday.getDate() + 7);
  return nextThursday;
};



App.updateWeeksStatus = () => {
  const userData = getUserData();
  const parisCurrentDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  // Dates de début des semaines
  const weekDates = [
    new Date('2025-07-17T09:00:00+02:00'),
    new Date('2025-07-24T09:00:00+02:00'),
    new Date('2025-07-31T09:00:00+02:00'),
    new Date('2025-08-07T09:00:00+02:00'),
    new Date('2025-08-14T09:00:00+02:00'),
    new Date('2025-08-21T09:00:00+02:00'),
    new Date('2025-08-28T09:00:00+02:00'),
    new Date('2025-09-04T09:00:00+02:00'),
    new Date('2025-09-11T09:00:00+02:00'),
    new Date('2025-09-18T09:00:00+02:00')
  ];



  // Réinitialise les statuts
  for (let i = 0; i < 9; i++) {
    userData[`semaine${i + 1}`] = false;
  }
  weekDates.forEach((date, i) => {
    if (parisCurrentDate >= date) userData[`semaine${i + 1}`] = true;
  });
  saveUserData(userData);
  App.displayWeeklyQuests();
};

// Retourne la date de début du week-end (vendredi 09:00) pour la date donnée
// Retourne la date de début du week-end (vendredi 09:00) pour la date donnée
App.getWeekendStart = (date) => {
  // copie en heure de Paris
  const paris = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const day = paris.getDay(); // 0=dimanche … 6=samedi

  // Calcul du vendredi (jour 5) précédent ou courant
  const daysToFriday = (day + 2) % 7; // Nombre de jours depuis le dernier vendredi
  const friday = new Date(paris);
  friday.setDate(paris.getDate() - daysToFriday);
  friday.setHours(9, 0, 0, 0);

  // Si on est avant vendredi 9h cette semaine, prendre le vendredi précédent
  if (friday > paris) {
    friday.setDate(friday.getDate() - 7);
  }

  return friday;
};

// Teste si la date donnée est bien entre vendredi 09h (inclus) et lundi 09h (exclu)
App.isInWeekendPeriod = (date) => {
  const paris = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const day = paris.getDay();
  const hour = paris.getHours();

  // Vendredi après 9h00 ou Samedi/Dimanche à n'importe quelle heure
  if ((day === 5 && hour >= 9) || day === 6 || day === 0) {
    return true;
  }

  // Lundi avant 9h00
  if (day === 1 && hour < 9) {
    return true;
  }

  return false;
};

// --- GESTION DES QUÊTES DU WEEK-END AVEC CODES DE TYPE ---
App.assignWeekendQuests = () => {
  const userData = getUserData();
  const container = document.getElementById('weekend-quests');
  const now = new Date();
  const parisNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));

  // 1) Si hors créneau week-end : supprimer les quêtes et cacher le conteneur
  if (!App.isInWeekendPeriod(parisNow)) {
    if (container) container.style.display = 'none';

    // Supprimer les données des quêtes week-end
    userData.quetes_weekend = false;
    userData.weekend_period_start = null;
    userData.weekend_bonus_claimed = false;

    // Supprimer toutes les données des quêtes week-end individuelles
    const weekendIds = ['weekend-quete1', 'weekend-quete2', 'weekend-quete3'];
    weekendIds.forEach(id => {
      delete userData[`${id}_text`];
      delete userData[`${id}_total`];
      delete userData[`${id}_current`];
      delete userData[`${id}_type`];
      delete userData[`${id}_reward`];
      delete userData[`${id}_character`];
      delete userData[`${id}_completed`];
    });

    saveUserData(userData);
    return;
  }

  // 2) On est dans la période week-end : afficher le conteneur
  if (container) container.style.display = '';

  const periodStartISO = App.getWeekendStart(parisNow).toISOString();

  // 3) Si les quêtes sont déjà générées pour cette période
  if (userData.quetes_weekend && userData.weekend_period_start === periodStartISO) {
    const weekendIds = ['weekend-quete1', 'weekend-quete2', 'weekend-quete3'];

    // Affichage et mise à jour des barres de progression
    weekendIds.forEach(id => {
      const text = userData[`${id}_text`];
      const total = userData[`${id}_total`];
      const current = userData[`${id}_current`] || 0;
      const el = document.getElementById(id);

      if (el && text) {
        el.innerHTML = `
        <li>
          <p>${text}</p>
          <p class="reward-info">Récompense : ${App.WEEK_REWARD_AMOUNT} d'argent</p>
          <div class="progress-bar-container">
            <div class="progress-bar" id="${id}-bar"></div>
            <div class="progress-bar-text" id="${id}-text">
              ${current >= total ? 'Quête terminée' : `${current} / ${total}`}
            </div>
          </div>
        </li>`;

        const barEl = document.getElementById(`${id}-bar`);
        const textEl = document.getElementById(`${id}-text`);
        if (barEl && textEl) {
          App.updateProgressBar(barEl, textEl, total, current);
        }
      }
    });

    // Attribution automatique de la récompense par quête terminée
    weekendIds.forEach(id => {
      const total = userData[`${id}_total`] || 0;
      const current = userData[`${id}_current`] || 0;
      const doneKey = `${id}_completed`;

      if (current >= total && !userData[doneKey]) {
        userData.argent = (userData.argent || 0) + App.WEEK_REWARD_AMOUNT;
        userData[doneKey] = true;
        alert(`Quête "${userData[`${id}_text`]}" terminée : +${App.WEEK_REWARD_AMOUNT} argent`);
      }
    });

    // Bonus si toutes les quêtes sont terminées
    const allDone = weekendIds.every(id => {
      const total = userData[`${id}_total`] || 0;
      const current = userData[`${id}_current`] || 0;
      return current >= total;
    });

    if (allDone && !userData.weekend_bonus_claimed) {
      userData.argent = (userData.argent || 0) + 40;
      userData.weekend_bonus_claimed = true;
      alert(`Bonus week-end accordé : +40 argent`);
    }

    saveUserData(userData);
    return;
  }

  // 4) Génération de nouvelles quêtes pour cette période week-end
  userData.quetes_weekend = true;
  userData.weekend_period_start = periodStartISO;
  userData.weekend_bonus_claimed = false;

  const available = [];
  const unlocked = App.CHARACTERS.filter(c => userData[c] === 1);

  // Quête avec personnage spécifique si disponible
  if (unlocked.length > 0) {
    const c = unlocked[Math.floor(Math.random() * unlocked.length)];
    const w = App.getRandomNumber(3, 5);
    available.push({ 
      text: `Gagner ${w} parties avec ${c} en mode Weekend.`, 
      total: w, 
      type: 'VCW', 
      current: 0, 
      character: c 
    });
  }

  // Quêtes génériques
  const DW = App.getRandomNumber(45000, 90000);
  available.push({ 
    text: `Infliger ${DW} points de dégâts en mode Weekend.`, 
    total: DW, 
    type: 'DCW', 
    current: 0 
  });

  const OW = App.getRandomNumber(5, 13);
  available.push({ 
    text: `Utiliser ${OW} objets en mode Weekend.`, 
    total: OW, 
    type: 'OW', 
    current: 0 
  });

  const DEW = App.getRandomNumber(10, 22);
  available.push({ 
    text: `Se défendre ${DEW} fois en mode Weekend.`, 
    total: DEW, 
    type: 'DECW', 
    current: 0 
  });

  // Sélection aléatoire de 3 quêtes
  const picks = App.getRandomElements(available, 3);

  picks.forEach((q, i) => {
    const id = `weekend-quete${i + 1}`;
    Object.assign(userData, {
      [`${id}_text`]: q.text,
      [`${id}_total`]: q.total,
      [`${id}_current`]: q.current,
      [`${id}_type`]: q.type,
      [`${id}_reward`]: App.WEEK_REWARD_AMOUNT,
      [`${id}_character`]: q.character || null,
      [`${id}_completed`]: false
    });

    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = `
      <li>
        <p>${q.text}</p>
        <p class="reward-info">Récompense : ${App.WEEK_REWARD_AMOUNT} d'argent</p>
        <div class="progress-bar-container">
          <div class="progress-bar" id="${id}-bar"></div>
          <div class="progress-bar-text" id="${id}-text">0 / ${q.total}</div>
        </div>
      </li>`;

      const barEl = document.getElementById(`${id}-bar`);
      const textEl = document.getElementById(`${id}-text`);
      if (barEl && textEl) {
        App.updateProgressBar(barEl, textEl, q.total, 0);
      }
    }
  });

  saveUserData(userData);
};

// --- PARAMÈTRES DU SYSTÈME D’ÉTÉ --
// Dates et quêtes d’été
App.SUMMER_START_DATE = '2025-05-25'; // date de début (YYYY-MM-JJ)
App.SUMMER_QUESTS = [
  { text: 'Gagne 1 partie (hors mode survie)', total: 1, type: 'VTM' },
  { text: 'Gagne 1 partie sans jamais utiliser la défense (hors mode survie)', total: 1, type: 'VSD' },
  { text: 'Utilise ta capacité spéciale 3 fois dans la même partie (hors mode survie)', total: 1, type: 'CSP' },
  { text: 'Inflige au moins 10 000 de dégâts totaux en une partie (hors mode survie)', total: 1, type: 'DPS' },
  { text: 'Restaure au moins 4 000 PV via potions et/ou amulette dans une même partie (hors mode survie)', total: 1, type: 'SMP' },
  { text: "Utilise au moins 3 objets différents au cours d'une même partie (hors mode survie)", total: 1, type: 'ODP' },
  { text: 'Gagne 1 partie en moins de 30 tours (hors mode survie)', total: 1, type: 'VMT' },
  { text: 'Inflige au moins 1 000 de dégâts en un seul tour (hors mode survie)', total: 1, type: 'MDST' },
  { text: 'Inflige au moins 12 000 de dégâts totaux en une partie (hors mode survie)', total: 1, type: 'DPS2' },
  { text: 'Gagne 1 partie avec un personnage Épique ou Légendaire (hors mode survie)', total: 1, type: 'VEL' },
  { text: "Active l'amulette de régénération et récolte 5 heals", total: 5, type: 'ASH' },
  { text: 'Utilise 3 potions de soin dans une seule partie (hors mode survie)', total: 1, type: 'USP' },
  { text: "Survivre 5 manches d'affilé en mode survie", total: 1, type: 'SMS' },
  { text: 'Remporte 4 parties (hors mode survie)', total: 1, type: 'VPS' },
  { text: 'Remporter 3 parties avec Perro (hors mode survie)', total: 1, type: 'VPP' },
];

// renvoie le nombre de jours écoulés depuis le début (0-based)
App.getSummerDayIndex = () => {
  const tz = { timeZone: 'Europe/Paris' };
  const today = new Date(new Date().toLocaleString('en-US', tz)).setHours(0, 0, 0, 0);
  const start = new Date(App.SUMMER_START_DATE + 'T00:00:00+02:00').getTime();
  return Math.max(0, Math.floor((today - start) / (1000 * 60 * 60 * 24)));
};

// Génération des quêtes d’été (une seule fois)
App.generateSummerQuests = () => {
  const u = getUserData();
  if (u.summer_genere) return;

  App.SUMMER_QUESTS.forEach((q, i) => {
    const key = `Summer${i + 1}`;
    Object.assign(u, {
      [`${key}_text`]: q.text,
      [`${key}_total`]: q.total,
      [`${key}_current`]: 0,
      [`${key}_type`]: q.type,
      [`${key}_completed`]: false,
      [`${key}_reward`]: '30 Points',
      [`${key}_active`]: false
    });
  });

  u.summer_genere = true;
  saveUserData(u);
};

// Affichage des quêtes d’été selon le jour (active/inactive)
App.displaySummerQuests = () => {
  const u = getUserData();
  const container = document.getElementById('summer-quests');
  if (!container) return;

  const max = Math.min(App.SUMMER_QUESTS.length, App.getSummerDayIndex() + 1);

  // mise à jour des flags active
  App.SUMMER_QUESTS.forEach((_, i) => {
    u[`Summer${i + 1}_active`] = (i < max);
  });

  // reconstruction du HTML
  let html = '';
  for (let i = 1; i <= App.SUMMER_QUESTS.length; i++) {
    const key = `Summer${i}`;
    const active = u[`${key}_active`];
    if (!active) continue;

    const text = u[`${key}_text`];
    const tot = u[`${key}_total`];
    const cur = u[`${key}_current`];
    const done = cur >= tot;
    if (done) u[`${key}_completed`] = true;

    html += `
      <li>
        <p>${text}</p>
        <p class="reward-info">Récompense : ${u[`${key}_reward`]}</p>
        <div class="progress-bar-container" id="summer-${i}">
          <div class="progress-bar"></div>
          <div class="progress-bar-text">${done ? 'Quête terminée' : `${cur} / ${tot}`}</div>
        </div>
      </li>
    `;
  }

  container.innerHTML = html;

  // mise à jour graphique des barres pour les actives
  for (let i = 1; i <= max; i++) {
    App.updateWeeklyProgressBar(
      `summer-${i}`,
      getUserData()[`Summer${i}_total`],
      getUserData()[`Summer${i}_current`]
    );
  }

  // --- Récompense automatique des quêtes d'été ---
  for (let i = 1; i <= max; i++) {
    const key = `Summer${i}`;
    const done = u[`${key}_current`] >= u[`${key}_total`];
    if (done && !u[`${key}_rewardClaimed`]) {
      u.argent = (u.argent || 0) + 30;
      u[`${key}_rewardClaimed`] = true;
      alert(`Quête d'été "${u[`${key}_text`]}" terminée : +30 points`);
    }
  }

  saveUserData(u);
};

// Compteur jusqu’au prochain jour à 09:00
App.getNextSummerAtNine = () => {
  const tz = { timeZone: 'Europe/Paris' };
  const now = new Date(new Date().toLocaleString('en-US', tz));
  const next = new Date(now.setHours(9, 0, 0, 0));
  if (now >= next) next.setDate(next.getDate() + 1);
  return next;
};
App.updateSummerCountdown = () => {
  const now = Date.now();
  const next = App.getNextSummerAtNine().getTime();
  document.getElementById('summer-countdown').textContent =
    'Prochaines quêtes dans : ' + App.formatDiff(next - now);
};

// --- GESTION DES TIMERS ---

// Stockage des IDs pour pouvoir les arrêter
App.countdownId = null;  // pour daily/weekend/weekly
App.summerCountdownId = null;  // pour l’été

// Démarre le compteur d’été en mémorisant l’ID
App.startSummerCountdown = () => {
  App.updateSummerCountdown();
  App.summerCountdownId = setInterval(App.updateSummerCountdown, 1000);
};

// Méthode pour stopper tous les timers actifs
App.stopAllTimers = () => {
  if (App.countdownId !== null) {
    clearInterval(App.countdownId);
    App.countdownId = null;
  }
  if (App.summerCountdownId !== null) {
    clearInterval(App.summerCountdownId);
    App.summerCountdownId = null;
  }
};

// Routine générique pour daily/weekend/weekly
App.startCountdowns = () => {
  if (App.countdownId !== null) {
    clearInterval(App.countdownId);
  }
  App.updateAllCountdowns();
  App.countdownId = setInterval(App.updateAllCountdowns, 1000);
};

// --- INITIALISATION AU CHARGEMENT ---

// On stoppe tout timer si l’utilisateur quitte ou recharge la page
window.addEventListener('beforeunload', () => {
  App.stopAllTimers();
});

App.storedData = getUserData();
if (!App.storedData.quetes_genere) {
  App.generateWeeklyQuests();
  App.updateWeeksStatus();
} else {
  App.updateWeeksStatus();
}
App.assignRandomQuest();
App.checkAllQuestsCompletion(getUserData());
App.assignWeekendQuests();
App.startCountdowns();

App.generateSummerQuests();
App.displaySummerQuests();
App.startSummerCountdown();



// 1) Fonction de nettoyage des timers et masquage des compte-à-rebours
App.clearQuestPage = () => {
  // Arrête tous les intervalles
  App.stopAllTimers();
  // Listes des IDs à masquer
  const ids = [
    'daily-countdown',
    'weekly-countdown',
    'weekend-countdown',
    'summer-countdown',
    'weekly-quests',
    'weekend-quests',
    'summer-quests'
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
};

// 2) Déclenchement automatique au moment de quitter la page
// - Sur rechargement ou fermeture d’onglet
// - Sur navigation interne (SPA) via l’événement `pagehide`
window.addEventListener('pagehide', App.clearQuestPage);

// --- Pour les applications à routage client (ex. Vue, React Router) ---
// Si vous utilisez un routeur, appelez App.clearQuestPage() dans le hook de sortie :
/*
router.beforeEach((to, from, next) => {
  if (from.name === 'QuestsPage') {
    App.clearQuestPage();
  }
  next();
});
*/
