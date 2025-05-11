window.App = window.App || {};

// --- Navigation et démarrage de la partie ---
App.startGameIfStarted = () => {
  const userData = getUserData();
  if (userData.partie_commencee) loadPage('combat');
  else if (userData.partie_commencee_weekend) loadPage('combat-weekend');
};
App.startGameIfStarted();

// --- CONFIGURATION DES RÉCOMPENSES ---
App.DAILY_REWARD_AMOUNT = 10;
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
            <p>${questText}</p>
            <p class="reward-info">Récompense : ${App.DAILY_REWARD_AMOUNT} d'argent</p>
            <div class="progress-bar-container">
              <div class="progress-bar" id="${id}-bar"></div>
              <div class="progress-bar-text" id="${id}-text">Quête terminée</div>
            </div>
          `;
        } else {
          allQuestsCompleted = false;
          questElement.innerHTML = `
            <p>${questText}</p>
            <p class="reward-info">Récompense : ${App.DAILY_REWARD_AMOUNT} d'argent</p>
            <div class="progress-bar-container">
              <div class="progress-bar" id="${id}-bar"></div>
              <div class="progress-bar-text" id="${id}-text">${questCurrent} / ${questTotal}</div>
            </div>
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
        <p>${quest.text}</p>
        <p class="reward-info">Récompense : ${App.DAILY_REWARD_AMOUNT} d'argent</p>
        <div class="progress-bar-container">
          <div class="progress-bar" id="${id}-bar"></div>
          <div class="progress-bar-text" id="${id}-text">${quest.current} / ${quest.total}</div>
        </div>
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

App.updateAllCountdowns = () => {
  const now = Date.now();

  // Quotidiennes → demain 09:00
  const nextDaily = App.getNextDailyAtNine().getTime();
  document.getElementById('daily-countdown').textContent =
    'Actualisation dans : ' + App.formatDiff(nextDaily - now);

  // Week-end → prochain lundi 09:00
  const parisNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  let targetTime;
  let label;
  if (App.isInWeekendPeriod(parisNow)) {
    targetTime = App.getNextMondayAtNine().getTime();
    label = 'Suppression dans : ';
  } else {
    targetTime = App.getNextSaturdayAtNine().getTime();
    label = 'Prochaines quêtes dans : ';
  }
  document.getElementById('weekend-countdown').textContent =
    label + App.formatDiff(targetTime - now);

  // Hebdomadaires → comme avant (jeudi 09:00)
  const nextThu = App.getNextThursdayAtNine().getTime();
  document.getElementById('weekly-countdown').textContent =
    'Prochaines quêtes dans : ' + App.formatDiff(nextThu - now);
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
App.getWeekendStart = (date) => {
  // copie en heure de Paris
  const paris = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const day = paris.getDay(); // 0=dimanche … 6=samedi
  // calcul du samedi précédent ou courant
  const daysSinceSaturday = (day + 1) % 7;
  const saturday = new Date(paris);
  saturday.setDate(paris.getDate() - daysSinceSaturday);
  saturday.setHours(9, 0, 0, 0);
  return saturday;
};


// Teste si la date donnée est bien entre vendredi 09h (inclus) et lundi 09h (exclu)
App.isInWeekendPeriod = (date) => {
  const start = App.getWeekendStart(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 3); // +3 jours = lundi 09h
  return date >= start && date < end;
};


// --- GESTION DES QUÊTES DU WEEK-END AVEC CODES DE TYPE ---
App.assignWeekendQuests = () => {
  const userData = getUserData();
  const container = document.getElementById('weekend-quests');
  const now = new Date();
  const parisNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));

  // 1) hors créneau : cacher et sortir
  if (!App.isInWeekendPeriod(parisNow)) {
    if (container) container.style.display = 'none';
    return;
  }

  // 2) afficher le conteneur
  if (container) container.style.display = '';

  const periodStartISO = App.getWeekendStart(parisNow).toISOString();

  // 3) si déjà générées ce week-end
  if (userData.quetes_weekend && userData.weekend_period_start === periodStartISO) {
    const weekendIds = ['weekend-quete1', 'weekend-quete2', 'weekend-quete3'];

    // affichage et barre de progression
    weekendIds.forEach(id => {
      const text = userData[`${id}_text`];
      const total = userData[`${id}_total`];
      const current = userData[`${id}_current`];
      const el = document.getElementById(id);
      el.innerHTML = `
        <p>${text}</p>
        <p class="reward-info">Récompense : ${App.WEEK_REWARD_AMOUNT} d'argent</p>
        <div class="progress-bar-container">
          <div class="progress-bar" id="${id}-bar"></div>
          <div class="progress-bar-text" id="${id}-text">
            ${current >= total ? 'Quête terminée' : `${current} / ${total}`}
          </div>
        </div>`;
      App.updateProgressBar(
        document.getElementById(`${id}-bar`),
        document.getElementById(`${id}-text`),
        total, current
      );
    });

    // attribution automatique de la récompense par quête
    weekendIds.forEach(id => {
      const total = userData[`${id}_total`];
      const current = userData[`${id}_current`];
      const doneKey = `${id}_completed`;
      if (current >= total && !userData[doneKey]) {
        userData.argent = (userData.argent || 0) + App.WEEK_REWARD_AMOUNT;
        userData[doneKey] = true;
        // (optionnel) notification
        alert(`Quête "${userData[`${id}_text`]}" terminée : +${App.WEEK_REWARD_AMOUNT} argent`);
      }
    });

    // bonus si toutes les quêtes sont terminées
    const allDone = weekendIds.every(id =>
      userData[`${id}_current`] >= userData[`${id}_total`]
    );
    if (allDone && !userData.weekend_bonus_claimed) {
      userData.argent += 40; // ou autre valeur si différente
      userData.weekend_bonus_claimed = true;
      alert(`Bonus week-end accordé : +40 argent`);
    }

    saveUserData(userData);
    return;
  }

  // 4) (re)génération des quêtes
  userData.quetes_weekend = true;
  userData.weekend_period_start = periodStartISO;

  const available = [];
  const unlocked = App.CHARACTERS.filter(c => userData[c] === 1);
  if (unlocked.length) {
    const c = unlocked[Math.floor(Math.random() * unlocked.length)];
    const w = App.getRandomNumber(3, 5);
    available.push({ text: `Gagner ${w} parties avec ${c} en mode Weekend.`, total: w, type: 'VCW', current: 0, character: c });
  }
  const DW = App.getRandomNumber(45000, 90000);
  available.push({ text: `Infliger ${DW} points de dégâts en mode Weekend.`, total: DW, type: 'DCW', current: 0 });
  const OW = App.getRandomNumber(5, 13);
  available.push({ text: `Utiliser ${OW} objets en mode Weekend.`, total: OW, type: 'OW', current: 0 });
  const DEW = App.getRandomNumber(10, 22);
  available.push({ text: `Se défendre ${DEW} fois en mode Weekend.`, total: DEW, type: 'DECW', current: 0 });

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
    el.innerHTML = `
      <p>${q.text}</p>
      <p class="reward-info">Récompense : ${App.WEEK_REWARD_AMOUNT} d'argent</p>
      <div class="progress-bar-container">
        <div class="progress-bar" id="${id}-bar"></div>
        <div class="progress-bar-text" id="${id}-text">0 / ${q.total}</div>
      </div>`;
    App.updateProgressBar(
      document.getElementById(`${id}-bar`),
      document.getElementById(`${id}-text`),
      q.total, 0
    );
  });

  saveUserData(userData);
};



App.countdownId = null;

App.startCountdowns = () => {
  // Si un ancien timer existe, on le stoppe d’abord
  if (App.countdownId !== null) {
    clearInterval(App.countdownId);
  }
  // Mise à jour et relance toutes les  secondes
  App.updateAllCountdowns();
  App.countdownId = setInterval(App.updateAllCountdowns, 1000);
};

// --- INITIALISATION AU CHARGEMENT ---
App.storedData = getUserData();
if (!App.storedData.quetes_genere) {
  App.generateWeeklyQuests();
  App.updateWeeksStatus();
  console.log(App.storedData);
} else {
  App.updateWeeksStatus();
  console.log(App.storedData);
}
App.assignRandomQuest();
App.checkAllQuestsCompletion(getUserData());
App.assignWeekendQuests();
App.startCountdowns();