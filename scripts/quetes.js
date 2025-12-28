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
App.CHARACTERS = ['Willy', 'Cocobi', 'Sboonie', 'Rosalie', 'Poulpy', 'Inconnu', 'Diva', 'Colorina', 'Grours', 'Oiseau', 'Baleine', 'Doudou', 'Coeur', 'Perro', 'Nautilus', 'Boompy', 'Paradoxe', 'Korb', ];

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
          // Correction syntaxe et logique : on marque comme complété avant de réclamer
          if (!userData[`${id}_completed`] || !userData[`${id}_rewardClaimed`]) {
            userData[`${id}_completed`] = true;
            App.checkAndRewardQuestCompletion(id, userData);
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

    const questTemplates = [
        { type: 'VPCS', text: (n, char) => `Gagner ${n} parties avec ${char} en mode classique.`, objectives: { easy: [5, 8], medium: [9, 15], hard: [16, 25] }, requiresCharacter: true },
        { type: 'SPS', text: (n, char) => `Survivre ${n} manches en mode survie avec ${char}.`, objectives: { easy: [10, 20], medium: [21, 35], hard: [36, 50] }, requiresCharacter: true },
        { type: 'VCS', text: (n) => `Gagner ${n} parties en mode classique.`, objectives: { easy: [7, 12], medium: [13, 20], hard: [21, 30] } },
        { type: 'DSC', text: (n) => `Infliger ${n} points de dégâts en mode classique.`, objectives: { easy: [75000, 150000], medium: [150001, 300000], hard: [300001, 600000] } },
        { type: 'O', text: (n) => `Utiliser ${n} objets.`, objectives: { easy: [8, 15], medium: [16, 25], hard: [26, 40] } },
        { type: 'SS', text: (n) => `Survivre à ${n} manches en mode survie.`, objectives: { easy: [15, 25], medium: [26, 40], hard: [41, 60] } },
        { type: 'DC', text: (n) => `Se défendre ${n} fois en mode classique.`, objectives: { easy: [15, 25], medium: [26, 40], hard: [41, 60] } },
        { type: 'CC', text: (n) => `Utiliser ${n} capacités spéciales en mode classique.`, objectives: { easy: [25, 40], medium: [41, 60], hard: [61, 80] } },
        { type: 'DS', text: (n) => `Infliger ${n} points de dégâts en mode survie.`, objectives: { easy: [100000, 200000], medium: [200001, 400000], hard: [400001, 700000] } },
        { type: 'CS', text: (n) => `Utiliser la capacité spéciale ${n} fois en mode survie.`, objectives: { easy: [25, 45], medium: [46, 65], hard: [66, 90] } },
        { type: 'CRC', text: (n) => `Faire ${n} coups critiques.`, objectives: { easy: [10, 20], medium: [21, 35], hard: [36, 50] } },
        { type: 'BSC', text: (n) => `Bloquer ${n} capacités spéciales.`, objectives: { easy: [8, 15], medium: [16, 25], hard: [26, 40] } }
    ];

    const weeklyRewards = {
        easy: { xp: 150, recompense: 1, text: "1 récompense aléatoire et 150XP pour le Parallel Pass" },
        medium: { xp: 250, recompense: 2, text: "2 récompenses aléatoires et 250XP pour le Parallel Pass" },
        hard: { xp: 500, recompense: 4, text: "4 récompenses aléatoires et 500XP pour le Parallel Pass" }
    };

    for (let week = 1; week <= 9; week++) {
        const unlockedCharacters = App.CHARACTERS.filter(c => userData[c] === 1);
        let availableTemplates = questTemplates.slice();
        if (unlockedCharacters.length === 0) {
            availableTemplates = availableTemplates.filter(t => !t.requiresCharacter);
        }

        const finalQuests = [];
        const difficultiesToAssign = ['hard', 'medium', 'medium', 'easy', 'easy'];
        let templatesToUse = App.getRandomElements(availableTemplates, 5);

        for(let i = 0; i < 5; i++) {
            const difficulty = difficultiesToAssign[i];
            const questTemplate = templatesToUse[i];

            const [min, max] = questTemplate.objectives[difficulty];
            const total = App.getRandomNumber(min, max);
            const reward = weeklyRewards[difficulty];
            let character = null;
            let text = '';

            if (questTemplate.requiresCharacter) {
                character = unlockedCharacters[Math.floor(Math.random() * unlockedCharacters.length)];
                text = questTemplate.text(total, character);
            } else {
                text = questTemplate.text(total);
            }

            finalQuests.push({
                text: text,
                total: total,
                current: 0,
                type: questTemplate.type,
                character: character,
                completed: false,
                reward_text: reward.text,
                reward_xp: reward.xp,
                reward_recompense: reward.recompense
            });
        }


        finalQuests.forEach((quest, idx) => {
            const id = `Semaine${week}_${idx + 1}`;
            Object.assign(userData, {
                [`${id}_text`]: quest.text,
                [`${id}_total`]: quest.total,
                [`${id}_current`]: quest.current,
                [`${id}_type`]: quest.type,
                [`${id}_completed`]: false,
                [`${id}_reward_text`]: quest.reward_text,
                [`${id}_reward_xp`]: quest.reward_xp,
                [`${id}_reward_recompense`]: quest.reward_recompense,
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
      if (!questText) continue; // Do not display empty quests
      const questTotal = userData[`${questKey}_total`] || 1;
      let questCurrent = userData[`${questKey}_current`] || 0;
      const rewardText = userData[`${questKey}_reward_text`] || "Récompense non spécifiée";

      if (questCurrent >= questTotal) {
        if (!userData[`${questKey}_completed`] || !userData[`${questKey}_rewardClaimed`]) {
            userData[`${questKey}_completed`] = true;
            App.checkAndRewardQuestCompletion(questKey, userData);
        }
      }
      const progressBarId = `week-${weekNumber}-quest-${i}`;
      weeklyContent += `<li>
        <p>${questText}</p>
        <p class="reward-info">Récompense : ${rewardText}</p>
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

// --- GESTION DES RÉCOMPENSES EN SÉRIE ---
App.activeClaimsCount = 0;
App.accumulatedRewards = [];

App.checkAndRewardQuestCompletion = (questKey, userData) => {
  if (userData[`${questKey}_completed`] && !userData[`${questKey}_rewardClaimed`]) {
    const user = firebase.auth().currentUser;
    if (!user) return;

    App.activeClaimsCount++;

    App.getRecaptchaToken('quest_claim').then(recaptchaToken => {
        user.getIdToken().then(token => {
            fetch('/api/quest/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ userId: user.uid, questKey: questKey, recaptchaToken: recaptchaToken })
            })
            .then(res => res.json())
            .then(data => {
                App.activeClaimsCount--;
                if (data.success) {
                    localStorage.setItem('userData', JSON.stringify(data.userData));
                    if (data.rewards) {
                        // Récupérer le texte de la quête
                        const questText = data.userData[questKey + '_text'] || "Quête accomplie";
                        // Ajouter l'intitulé de la quête à chaque récompense
                        const detailedRewards = data.rewards.map(r => ({
                            ...r,
                            info: `<span style="color:#bb86fc; font-weight:bold;">${questText}</span><br>${r.info || ''}`
                        }));
                        App.accumulatedRewards = App.accumulatedRewards.concat(detailedRewards);
                    }
                }
                
                // Si toutes les quêtes en cours ont été traitées, on affiche tout
                if (App.activeClaimsCount === 0 && App.accumulatedRewards.length > 0) {
                    sessionStorage.setItem('pendingRewards', JSON.stringify(App.accumulatedRewards));
                    App.accumulatedRewards = [];
                    loadPage('recompenses');
                }
            })
            .catch(() => {
                App.activeClaimsCount--;
            });
        });
    });
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
  const ids = ['daily-countdown', 'weekly-countdown', 'weekend-countdown'];
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
  const startDate = new Date('2026-01-15T07:00:00Z'); // 9h en France (UTC+1 en hiver)
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
    new Date('2026-03-19T09:00:00+02:00'),
    new Date('2026-03-26T09:00:00+02:00'),
    new Date('2026-04-02T09:00:00+02:00'),
    new Date('2026-04-09T09:00:00+02:00'),
    new Date('2026-04-16T09:00:00+02:00'),
    new Date('2026-04-23T09:00:00+02:00'),
    new Date('2026-04-30T09:00:00+02:00'),
    new Date('2026-05-07T09:00:00+02:00'),
    new Date('2026-05-14T09:00:00+02:00'),
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
          <p class="reward-info">Récompense : ${App.WEEK_REWARD_AMOUNT} Points</p>
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
      const doneKey = `${id}_rewardClaimed`;

      if (current >= total && !userData[doneKey]) {
        App.checkAndRewardQuestCompletion(id, userData);
      }
    });

    // Bonus si toutes les quêtes sont terminées
    const allDone = weekendIds.every(id => {
      const total = userData[`${id}_total`] || 0;
      const current = userData[`${id}_current`] || 0;
      return current >= total;
    });

    if (allDone && !userData.weekend_bonus_claimed) {
      if (!App.isClaimingWeekendBonus) {
          App.isClaimingWeekendBonus = true;
          const user = firebase.auth().currentUser;
          if (user) {
              App.activeClaimsCount++; // Ajouter à la file
              App.getRecaptchaToken('weekend_bonus').then(recaptchaToken => {
                  user.getIdToken().then(token => {
                      fetch('/api/quest/claim-weekend-bonus', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                          body: JSON.stringify({ userId: user.uid, recaptchaToken })
                      })
                      .then(res => res.json())
                      .then(data => {
                          App.activeClaimsCount--;
                          App.isClaimingWeekendBonus = false;
                          if (data.success) {
                              localStorage.setItem('userData', JSON.stringify(data.userData));
                              const detailedRewards = data.rewards.map(r => ({
                                  ...r,
                                  info: `<span style="color:#03dac6; font-weight:bold;">Toutes les quêtes weekend finies !</span><br>${r.info || ''}`
                              }));
                              App.accumulatedRewards = App.accumulatedRewards.concat(detailedRewards);
                          }
                          
                          // Déclencher l'affichage si c'est le dernier fini
                          if (App.activeClaimsCount === 0 && App.accumulatedRewards.length > 0) {
                              sessionStorage.setItem('pendingRewards', JSON.stringify(App.accumulatedRewards));
                              App.accumulatedRewards = [];
                              loadPage('recompenses');
                          }
                      });
                  });
              });
          }
      }
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
        <p class="reward-info">Récompense : ${App.WEEK_REWARD_AMOUNT} Points</p>
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



// --- GESTION DES TIMERS ---
// Stockage des IDs pour pouvoir les arrêter
App.countdownId = null;  // pour daily/weekend/weekly

// Démarre le compteur d’été en mémorisant l’ID

// Méthode pour stopper tous les timers actifs
App.stopAllTimers = () => {
  if (App.countdownId !== null) {
    clearInterval(App.countdownId);
    App.countdownId = null;
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

// 1) Fonction de nettoyage des timers et masquage des compte-à-rebours
App.clearQuestPage = () => {
  // Arrête tous les intervalles
  App.stopAllTimers();
  // Listes des IDs à masquer
  const ids = [
    'daily-countdown',
    'weekly-countdown',
    'weekend-countdown',
    'weekly-quests',
    'weekend-quests',
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
