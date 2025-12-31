// Logique de combat complète déportée sur le serveur
// Reproduit exactement le comportement de combat-core.js pour l'utilisateur

const fs = require('fs');
const path = require('path');

const ABILITIES_FILE = path.join(__dirname, '../data/abilities.json');
let ABILITIES_DATA = {};
try {
    if (fs.existsSync(ABILITIES_FILE)) {
        ABILITIES_DATA = JSON.parse(fs.readFileSync(ABILITIES_FILE, 'utf8'));
    }
} catch (e) {
    console.error("Error loading abilities data:", e);
}

// Helper for formatting logs
function formatLog(template, params) {
    let text = template || "";
    for (const key in params) {
        text = text.replace(new RegExp(`{${key}}`, 'g'), params[key]);
    }
    return text;
}

// --- Q-LEARNING AGENT INTEGRATION (SERVER-SIDE) ---
const AI_MODEL_FILE = path.join(__dirname, '../ai_model.json');

class QLearningAgent {
    constructor(name = "UNIVERSAL", epsilon = 0.05, alpha = 0.1, gamma = 0.9) {
        this.name = name;
        this.epsilon = epsilon;
        this.alpha = alpha;
        this.gamma = gamma;
        this.qTable = {};
        this.loadWeights();
    }

    getStateKey(me, opponent, lastActionName) {
        const oppName = opponent.name;
        const myHP = me.pv / (me.pv_maximum || me.pv_max || 1);
        const oppHP = opponent.pv / (opponent.pv_maximum || opponent.pv_max || 1);
        const diff = myHP - oppHP;
        let hpState = "EQ"; 
        if (diff < -0.3) hpState = "VD"; 
        else if (diff < -0.1) hpState = "D"; 
        else if (diff > 0.3) hpState = "VA"; 
        else if (diff > 0.1) hpState = "A";

        const mySpe = (me.spe || 0) >= 1.0 ? "RDY" : "CHG";
        const oppSpe = (opponent.spe || 0) >= 1.0 ? "RDY" : "CHG";
        const canDefend = ((me.defense_droit || 0) === 0 && (me.spe || 0) >= 0.1) ? "YES" : "NO";
        const actionStr = lastActionName || 'attacker';

        // Structure: Me_VS_Opponent_MyLastAction_HPState_MySpe_OppSpe_CanDefend
        return `${me.name}_VS_${oppName}_${actionStr}_${hpState}_${mySpe}_${oppSpe}_${canDefend}`;
    }

    getQValues(state) {
        if (!this.qTable[state]) {
            this.qTable[state] = [0, 0, 0]; // [Attack, Defend, Special]
        }
        return this.qTable[state];
    }

    chooseAction(me, opponent, lastActionName) {
        const state = this.getStateKey(me, opponent, lastActionName);
        const validActions = [0]; 
        if ((me.defense_droit || 0) === 0 && (me.spe || 0) >= 0.1) validActions.push(1); 
        if ((me.spe || 0) >= 1.0 && (me.inconnu_super || 0) === 0) validActions.push(2);

        if (Math.random() < this.epsilon) {
            const randomIndex = Math.floor(Math.random() * validActions.length);
            return { actionIndex: validActions[randomIndex], state: state };
        }

        const qValues = this.getQValues(state);
        let bestAction = validActions[0];
        let maxQ = -Infinity;
        for (const action of validActions) {
            if (qValues[action] > maxQ) {
                maxQ = qValues[action];
                bestAction = action;
            }
        }
        return { actionIndex: bestAction, state: state };
    }

    learn(previousState, previousActionIndex, reward, me, opponent, isTerminal) {
        if (!previousState || previousActionIndex === null) return;
        const qValues = this.getQValues(previousState);
        const currentQ = qValues[previousActionIndex];
        let maxNextQ = 0;
        if (!isTerminal) {
            const nextState = this.getStateKey(me, opponent, this.getVerboseActionName(previousActionIndex));
            const nextQValues = this.getQValues(nextState);
            maxNextQ = Math.max(...nextQValues);
        }
        const newQ = currentQ + this.alpha * (reward + this.gamma * maxNextQ - currentQ);
        this.qTable[previousState][previousActionIndex] = newQ;
    }

    getInternalActionName(actionIndex) {
        switch (actionIndex) {
            case 0: return 'attack';
            case 1: return 'defend';
            case 2: return 'special';
            default: return 'attack';
        }
    }

    getVerboseActionName(actionIndex) {
        switch (actionIndex) {
            case 0: return 'attacker';
            case 1: return 'se défendre';
            case 2: return 'utiliser capacité spéciale';
            default: return 'attacker';
        }
    }

    loadWeights() {
        if (fs.existsSync(AI_MODEL_FILE)) {
            try {
                const content = fs.readFileSync(AI_MODEL_FILE, 'utf8');
                if (!content.trim()) { this.qTable = {}; return; }
                const data = JSON.parse(content);
                if (data && data["UNIVERSAL"] && data["UNIVERSAL"].qTable) {
                    this.qTable = data["UNIVERSAL"].qTable;
                    this.epsilon = data["UNIVERSAL"].epsilon || this.epsilon;
                } else {
                    this.qTable = data.qTable || data || {};
                }
                console.log(`[AI] Loaded Q-Table with ${Object.keys(this.qTable).length} states.`);
            } catch (e) {
                console.error("Error loading Q-Table:", e);
                this.qTable = {};
            }
        }
    }

    saveWeights() {
        try {
            let data = {};
            if (fs.existsSync(AI_MODEL_FILE)) {
                try { 
                    const content = fs.readFileSync(AI_MODEL_FILE, 'utf8');
                    if (content.trim()) data = JSON.parse(content);
                } catch (e) {}
            }
            data["UNIVERSAL"] = { qTable: this.qTable, epsilon: this.epsilon };
            fs.writeFileSync(AI_MODEL_FILE, JSON.stringify(data, null, 2), 'utf8');
        } catch (e) { console.error("Error saving Q-Table:", e); }
    }

    recordGameOver(game, winner) {
        const ai = game.opponent;
        const player = game.player;
        const aiState = game.aiState;
        if (!aiState || !aiState.lastState) return;
        const winBonus = (winner === 'opponent') ? 100 : -100;
        this.learn(aiState.lastState, aiState.lastAction, winBonus, ai, player, true);
        this.saveWeights();
    }
}

const aiAgent = new QLearningAgent();

// ------------------------------------------------------------------------------------------------

const combatEngine = {
    effectNames: {
        'orbe_siphon_effect': "Gain d'énergie réduit",
        'purge_spirituelle': "Purge Spirituelle",
        'diva_special': "Attaque réduite",
        'poulpy_special': "Défense fragilisée",
        'oiseau_special': "Défense renforcée",
        'colorina_special': "Défense affaiblie",
        'sboonie_special': "Attaque affaiblie",
        'inconnu_buff_att': "Attaque augmentée",
        'inconnu_buff_def': "Défense augmentée",
        'perro_special': "Défense perforée",
        'nautilus_debuff': "Défense brisée",
        'epee_tranchante': "Bonus de l'Épée Tranchante",
        'elixir_puissance': "Bonus de l'Elixir de Puissance",
        'armure_fer_debuff': "Malus de l'Armure de Fer",
        'bouclier_solide': "Bonus du Bouclier Solide",
    },

    getEffectiveStat(character, statName) {
        const baseStatValue = character[statName + '_originale'] || character[statName];
        let additiveBonus = 0;
        let multiplicativeBonus = 1;

        // Bonus Amulette du Paria
        if ((character.equipments || []).includes('amulette_paria') && character.pv < ((character.pv_maximum || character.pv_max) * 0.5)) {
            if (statName === 'attaque') {
                additiveBonus += 20;
            } else if (statName === 'defense') {
                additiveBonus += 15;
            }
        }

        if (character.effects && character.effects.length > 0) {
            character.effects.forEach(effect => {
                if (effect.stat === statName) {
                    if (effect.type === 'additive') additiveBonus += effect.value;
                    else if (effect.type === 'multiplicative') multiplicativeBonus *= effect.value;
                }
            });
        }

        if (statName === 'attaque' && character.isRaging) {
            const pvPercentage = character.pv / (character.pv_maximum || character.pv_max || 1);
            if (pvPercentage <= 0.3) multiplicativeBonus *= 1.3;
            else if (pvPercentage <= 0.6) multiplicativeBonus *= 1.15;
        }
        if (statName === 'defense' && character.fragileArmor) multiplicativeBonus *= 0.5;

        return Math.round((baseStatValue + additiveBonus) * multiplicativeBonus);
    },

    calculateDamage(attacker, defender, allowCrit) {
        const defenseModifier = 0.9 + Math.random() * 0.2;
        const effectiveAttackerAttack = this.getEffectiveStat(attacker, 'attaque');
        const effectiveDefenderDefense = this.getEffectiveStat(defender, 'defense');
        const effectiveCritChance = this.getEffectiveStat(attacker, 'critique');

        const modifiedDefense = Math.round(effectiveDefenderDefense * defenseModifier);
        let damage = Math.max(0, effectiveAttackerAttack - modifiedDefense);

        let isCrit = false;
        let isGuaranteedCrit = false;

        if (attacker.guaranteedCritNextAttack) {
            attacker.guaranteedCritNextAttack = false;
            damage = Math.round(damage * 1.5);
            isCrit = true;
            isGuaranteedCrit = true;
        } else if (allowCrit && effectiveCritChance > 0) {
            if (Math.random() * 100 < effectiveCritChance) {
                damage = Math.round(damage * 1.5);
                isCrit = true;
            }
        }
        return { damage, isCritical: isCrit, isGuaranteedCrit };
    },

    addEffect(character, effect) {
        if (!character.effects) character.effects = [];
        const existingEffectIndex = character.effects.findIndex(e => e.id === effect.id);
        if (existingEffectIndex > -1) character.effects[existingEffectIndex] = effect;
        else character.effects.push(effect);
    },

    isFemale(name) { return ["Diva", "Rosalie", "Doudou", "Colorina"].includes(name); },
    getPronoun(name, capitalize = true) { const p = this.isFemale(name) ? "elle" : "il"; return capitalize ? p.charAt(0).toUpperCase() + p.slice(1) : p; },
    getAgreement(name) { return this.isFemale(name) ? "e" : ""; },

    updateTour(player, opponent, isPlayer, results) {
        player.tourTT = (player.tourTT || 0) + 1;
        results.logs.push({ text: 'Tour ' + player.tourTT, color: 'grey', side: 'milieu' });
    },

    passerTour(character, results) {
        if (character.effects && character.effects.length > 0) {
            character.effects = character.effects.filter(effect => {
                if (effect.duration !== 999) effect.duration--;
                if (effect.duration <= 0) {
                    const effectName = this.effectNames[effect.id] || effect.id;
                    results.logs.push({ text: `L'effet "${effectName}" sur ${character.name} est terminé.`, color: 'grey', side: 'milieu' });
                    return false;
                }
                return true;
            });
        }
        if (character.inconnu_super >= 1) character.inconnu_super -= 1;
        if (character.immobilisation >= 1) character.immobilisation -= 1;
        if (character.defense_droit > 0) character.defense_droit -= 1;

        if (character.cursed) {
            const damage = Math.round((character.pv_maximum || character.pv_max) * 0.02);
            character.pv = Math.max(0, character.pv - damage);
            results.logs.push({ text: `${character.name} est maudit${this.getAgreement(character.name)} et perd ${damage} PV !`, color: 'red', side: 'milieu' });
        }
        if (character.blessed) {
            const heal = Math.round((character.pv_maximum || character.pv_max) * 0.02);
            character.pv = Math.min((character.pv_maximum || character.pv_max), character.pv + heal);
            results.logs.push({ text: `${character.name} est béni${this.getAgreement(character.name)} et regagne ${heal} PV !`, color: 'lightgreen', side: 'milieu' });
        }
    },

    applyItem(game, itemName, results) {
        const player = game.player;
        const opponent = game.opponent;
        player.objets_partie = (player.objets_partie || 0) + 1;
        player.objets_utilise = 1;
        let logText = `${itemName} utilisé !`;
        switch (itemName) {
            case 'Potion de Santé':
                player.pv = Math.min((player.pv_maximum || player.pv_max), player.pv + 1100);
                player.soin = (player.soin || 0) + 1100;
                player.objets_soin = (player.objets_soin || 0) + 1;
                logText = `Vous utilisez une Potion de Santé et récupérez 1100 PV.`;
                break;
            case 'Amulette de Régénération':
                player.amulette_soin = 1;
                player.objets_soin = (player.objets_soin || 0) + 1;
                logText = `Vous équipez l'Amulette de Régénération.`;
                break;
            case 'Épée Tranchante':
                this.addEffect(player, { id: 'epee_tranchante', stat: 'attaque', type: 'multiplicative', value: 1.05, duration: 999 });
                logText = `Vous utilisez une Épée Tranchante (+5% Attaque).`;
                break;
            case 'Elixir de Puissance':
                this.addEffect(player, { id: 'elixir_puissance', stat: 'attaque', type: 'additive', value: 50, duration: 999 });
                logText = `Vous buvez un Elixir de Puissance (+50 Attaque).`;
                break;
            case 'Armure de Fer':
                this.addEffect(opponent, { id: 'armure_fer_debuff', stat: 'attaque', type: 'multiplicative', value: 0.90, duration: 3 });
                logText = `Vous utilisez une Armure de Fer. L'attaque de l'adversaire est réduite de 10%.`;
                break;
            case 'Bouclier solide':
                this.addEffect(player, { id: 'bouclier_solide', stat: 'defense', type: 'additive', value: 15, duration: 999 });
                logText = `Vous équipez un Bouclier Solide (+15 Défense).`;
                break;
            case 'Marque de Chasseur':
                 this.addEffect(player, { id: 'marque_chasseur', stat: 'critique', type: 'additive', value: 100, duration: 1});
                 logText = `Vous utilisez Marque de Chasseur (Critique garanti).`;
                 break;
            case 'Orbe de Siphon':
                 this.addEffect(opponent, { id: 'orbe_siphon_effect', value: 0.5, duration: 3 });
                 logText = `Vous utilisez l'Orbe de Siphon.`;
                 break;
            case 'Purge Spirituelle':
                 const negIds = ['diva_special', 'poulpy_special', 'colorina_special', 'sboonie_special', 'perro_special', 'nautilus_debuff', 'armure_fer_debuff', 'focalisateur_debuff', 'riposte_affaiblie', 'boompy_surcharge_instable', 'frostbite_debuff_def', 'inferno_debuff_att', 'thunderstrike_debuff_att', 'stormbringer_debuff_def', 'earthshaker_debuff_def', 'paradoxe_assaut_def', 'paradoxe_garde_att', 'curse_effect', 'fragile_armor_effect'];
                player.effects = player.effects.filter(e => !negIds.includes(e.id));
                logText = `Vous utilisez Purge Spirituelle.`;
                break;
            case 'Crystal de renouveau':
                player.spe = Math.min(1, player.spe + 0.8);
                logText = `Vous utilisez un Crystal de renouveau (+80% Spécial).`;
                break;
            case "Cape de l'ombre":
                player.cape = true;
                logText = `Vous utilisez la Cape de l'ombre.`;
                break;
        }
        results.logs.push({ text: logText, color: 'white', side: 'milieu' });
    },

    handleAttack(attacker, defender, isPlayer, results) {
        const logColor = 'white';
        const pronoun = this.getPronoun(attacker.name);
        const agreement = this.getAgreement(attacker.name);
        let gainSpe = 0.25;
        if (["Doudou", "Diva", "Cocobi"].includes(attacker.name)) gainSpe = 0.20;
        if (["Boompy"].includes(attacker.name)) gainSpe = 0.34;
        
        // Weekend Event: Chargement /2 (Double speed)
        if (attacker.fastCharge) gainSpe *= 2;

        const siphon = attacker.effects && attacker.effects.find(e => e.id === 'orbe_siphon_effect');
        if (siphon) gainSpe *= siphon.value;
        attacker.spe = Math.min(1, attacker.spe + gainSpe);

        if (attacker.immobilisation > 0) { results.logs.push({ text: `${attacker.name} est immobilisé${agreement} !`, color: logColor, side: isPlayer }); return; }
        if (defender.cape) { results.logs.push({ text: `${attacker.name} rate sa cible à cause de la cape de l'ombre !`, color: logColor, side: isPlayer }); return; }

        const { damage, isCritical, isGuaranteedCrit } = this.calculateDamage(attacker, defender, true);
        let finalDamage = damage;
        if (isCritical) attacker.coups_critiques_partie = (attacker.coups_critiques_partie || 0) + 1;
        if ((attacker.equipments || []).includes('bottes_initie') && !attacker.bottesInitieUsed) { finalDamage += 10; attacker.bottesInitieUsed = true; results.logs.push({ text: `${attacker.name} inflige 10 dégâts bonus (Bottes de l'initié) !`, color: 'cyan', side: isPlayer }); }

        if (defender.defense_bouton === 1) {
            defender.defense_bouton = 0;
            finalDamage = Math.round(this.getEffectiveStat(attacker, 'attaque') * 0.2);
            results.logs.push({ text: `${defender.name} pare l'attaque !`, color: logColor, side: !isPlayer });
        }

        defender.pv = Math.max(0, defender.pv - finalDamage);
        attacker.degats_partie = (attacker.degats_partie || 0) + finalDamage;

        let text = "";
        if (isPlayer) {
            if (isGuaranteedCrit) text = `Grâce au Manteau de la Vengeance, vous lancez une attaque critique garantie ! Vous infligez ${finalDamage} points de dégâts à ${defender.name}.`;
            else if (isCritical) text = `Vous attaquez et faites un coup critique ! Vous infligez ${finalDamage} points de dégâts à ${defender.name}.`;
            else text = `Vous attaquez et infligez ${finalDamage} points de dégâts à ${defender.name}.`;
        } else {
            if (isGuaranteedCrit) text = `Grâce au Manteau de la Vengeance, ${attacker.name} lance une attaque critique garantie ! ${pronoun} inflige ${finalDamage} points de dégâts.`;
            else if (isCritical) text = `${attacker.name} attaque et fait un coup critique ! ${pronoun} inflige ${finalDamage} points de dégâts.`;
            else text = `${attacker.name} attaque et inflige ${finalDamage} points de dégâts.`;
        }
        results.logs.push({ text, color: logColor, side: isPlayer });
        if ((defender.equipments || []).includes('armure_epines')) { attacker.pv -= 5; results.logs.push({ text: `${defender.name} renvoie 5 dégâts (Armure à épines) !`, color: 'orange', side: !isPlayer }); }
    },

    applySpecialAbility(character, opponent, isPlayer, results) {
        const logColor = 'white';
        let damage = 0;
        let text = "";
        const data = ABILITIES_DATA[character.name] || ABILITIES_DATA["Default"];

        if (opponent.defense_bouton === 1 || opponent.isCountering) {
            opponent.defense_bouton = 0; opponent.isCountering = false; character.spe = 0;
            if (!isPlayer) opponent.special_countered_partie = (opponent.special_countered_partie || 0) + 1;
            results.logs.push({ text: `${character.name} utilise sa capacité spéciale mais ${opponent.name} l'anticipe et l'annule !`, color: logColor, side: isPlayer });
            return;
        }
        character.spe = 0;
        if (isPlayer) character.capacite_partie = (character.capacite_partie || 0) + 1;

        const commonParams = { attacker: character.name, defender: opponent.name };

        switch (character.name) {
            case "Diva":
                this.addEffect(opponent, { id: 'diva_special', stat: 'attaque', type: 'multiplicative', value: 0.75, duration: 3 });
                const effAtt = this.getEffectiveStat(opponent, 'attaque');
                damage = this.calculateDamage(character, opponent, false).damage;
                text = formatLog(data.log, { ...commonParams, stat_val: effAtt, damage: damage });
                break;
            case "Willy":
                for (let i = 0; i < 3; i++) damage += this.calculateDamage(character, opponent, false).damage;
                text = formatLog(data.log, { ...commonParams, damage: damage });
                break;
            case "Baleine":
                character.pv = Math.min(character.pv_maximum, character.pv + 1000);
                damage = this.calculateDamage(character, opponent, false).damage;
                text = formatLog(data.log, { ...commonParams, damage: damage });
                break;
            case "Doudou":
                const regen = Math.ceil(character.pv * (character.pv < character.pv_maximum / 2 ? 0.15 : 0.05));
                character.pv = Math.min(character.pv_maximum, character.pv + regen);
                damage = this.calculateDamage(character, opponent, false).damage;
                text = formatLog(data.log, { ...commonParams, regen: regen, damage: damage });
                break;
            case "Cocobi":
                damage = Math.ceil(opponent.pv_maximum * 0.12);
                text = formatLog(data.log, { ...commonParams, damage: damage });
                break;
            case "Coeur":
                damage = Math.round(this.getEffectiveStat(character, 'attaque') * 1.5);
                const heal = Math.round(damage * (character.pv > character.pv_maximum / 2 ? 0.1 : 0.15));
                character.pv = Math.min(character.pv_maximum, character.pv + heal);
                opponent.pv -= damage;
                text = formatLog(data.log, { ...commonParams, damage: damage, heal: heal });
                break;
            case "Grours":
                damage = (500 + this.getEffectiveStat(character, 'attaque')) - Math.round(this.getEffectiveStat(opponent, 'defense') * 0.5);
                text = formatLog(data.log, { ...commonParams, damage: damage });
                break;
            case "Poulpy":
                damage = Math.max(0, Math.round(this.getEffectiveStat(character, 'attaque') * 1.75 - this.getEffectiveStat(opponent, 'defense') * 0.6));
                this.addEffect(opponent, { id: 'poulpy_special', stat: 'defense', type: 'multiplicative', value: 0.85, duration: 3 });
                text = formatLog(data.log, { ...commonParams, damage: damage });
                break;
            case "Oiseau":
                damage = Math.round(this.getEffectiveStat(character, 'attaque') * 2.5);
                this.addEffect(character, { id: 'oiseau_special', stat: 'defense', type: 'additive', value: 20, duration: 2 });
                text = formatLog(data.log, { ...commonParams, damage: damage });
                break;
            case "Colorina":
                damage = Math.round(this.getEffectiveStat(character, 'attaque') * 0.85);
                this.addEffect(opponent, { id: 'colorina_special', stat: 'defense', type: 'multiplicative', value: 0.85, duration: 4 });
                text = formatLog(data.log, { ...commonParams, damage: damage });
                break;
            case "Rosalie":
                damage = Math.round(this.getEffectiveStat(character, 'attaque') * 2);
                if (Math.random() < 0.25) {
                    opponent.immobilisation = 1;
                    text = formatLog(data.log_immobilize, { ...commonParams, damage: damage });
                } else text = formatLog(data.log_normal, { ...commonParams, damage: damage });
                break;
            case "Sboonie":
                const pvsupp = Math.round(character.pv_maximum * 0.08);
                character.pv = Math.min(character.pv_maximum, character.pv + pvsupp);
                damage = 50;
                this.addEffect(opponent, { id: 'sboonie_special', stat: 'attaque', type: 'multiplicative', value: 0.85, duration: 2 });
                text = formatLog(data.log, { ...commonParams, regen: pvsupp });
                break;
            case "Inconnu":
                opponent.inconnu_super += 4;
                this.addEffect(character, { id: 'inconnu_buff_att', stat: 'attaque', type: 'additive', value: 25, duration: 3 });
                this.addEffect(character, { id: 'inconnu_buff_def', stat: 'defense', type: 'additive', value: 25, duration: 3 });
                damage = this.calculateDamage(character, opponent, false).damage;
                text = formatLog(data.log, { ...commonParams, turns: opponent.inconnu_super, damage: damage });
                break;
            case "Boompy":
                this.addEffect(character, { id: 'boompy_surcharge_instable', stat: 'defense', type: 'multiplicative', value: 0.70, duration: 3 });
                text = formatLog(data.log, commonParams);
                break;
            case "Perro":
                damage = Math.round(this.getEffectiveStat(character, 'attaque') * 0.85);
                this.addEffect(opponent, { id: 'perro_special', stat: 'defense', type: 'multiplicative', value: 0.70, duration: 3 });
                text = formatLog(data.log, { ...commonParams, damage: damage });
                break;
            case "Nautilus":
                let totalDmg = 0; const rAtt = this.getEffectiveStat(character, 'attaque') * 0.6;
                for (let i = 0; i < 3; i++) totalDmg += Math.max(0, Math.round(rAtt - this.getEffectiveStat(opponent, 'defense') * (0.9 + Math.random() * 0.2)));
                damage = totalDmg; text = formatLog(data.log, { ...commonParams, damage: damage });
                let tDefL = 0; for (let i = 0; i < 3; i++) if (Math.random() < 0.5) tDefL += 10;
                if (tDefL > 0) { 
                    this.addEffect(opponent, { id: 'nautilus_debuff', stat: 'defense', type: 'additive', value: -tDefL, duration: 999 }); 
                    text += formatLog(data.log_debuff, { ...commonParams, debuff: tDefL }); 
                }
                break;
            case "Paradoxe":
                character.effects = character.effects.filter(e => !e.id.startsWith('paradoxe_'));
                damage = 0;
                if (character.paradoxePosture === 'garde') {
                    character.paradoxePosture = 'assaut';
                    this.addEffect(character, { id: 'paradoxe_assaut_att', stat: 'attaque', type: 'multiplicative', value: 1.40, duration: 3 });
                    this.addEffect(character, { id: 'paradoxe_assaut_def', stat: 'defense', type: 'multiplicative', value: 0.50, duration: 3 });
                    text = formatLog(data.log_assaut, commonParams);
                } else {
                    character.paradoxePosture = 'garde';
                    this.addEffect(character, { id: 'paradoxe_garde_def', stat: 'defense', type: 'multiplicative', value: 1.60, duration: 3 });
                    this.addEffect(character, { id: 'paradoxe_garde_att', stat: 'attaque', type: 'multiplicative', value: 0.70, duration: 3 });
                    text = formatLog(data.log_garde, commonParams);
                }
                break;
            case "Korb":
                damage = Math.round(this.getEffectiveStat(character, 'attaque') * 0.75);
                this.addEffect(character, { id: 'korb_special', stat: 'critique', type: 'additive', value: 15, duration: 2 });
                text = formatLog(data.log, { ...commonParams, damage: damage });
                break;
            default:
                damage = Math.round(this.calculateDamage(character, opponent, false).damage * 1.5);
                text = formatLog(data.log, { ...commonParams, damage: damage });
        }
        if (character.name !== 'Coeur') opponent.pv -= damage;
        if (isPlayer) character.degats_partie = (character.degats_partie || 0) + damage;
        results.logs.push({ text, color: logColor, side: isPlayer });
    },

    updateMastery(userData, characterName, gameStats) {
        if (!userData.characters) userData.characters = {};
        if (!userData.characters[characterName]) userData.characters[characterName] = { masteryLevel: 0, masteryGrade: 0, masteryPoints: 0 };
        const m = userData.characters[characterName];
        let earned = 50; 
        if (gameStats.wavesCleared) earned = gameStats.wavesCleared * 12;
        m.masteryPoints += earned;
        const getReq = (l, g) => Math.floor(100 * Math.pow(1.6, l) * (1 + g * 0.25));
        let req = getReq(m.masteryLevel, m.masteryGrade);
        let leveled = false;
        while (m.masteryPoints >= req) {
            leveled = true; m.masteryPoints -= req; m.masteryGrade++;
            if (m.masteryGrade >= [3,4,5,5,5,10][m.masteryLevel] || 5) { m.masteryLevel++; m.masteryGrade = 0; }
            userData.argent = (userData.argent || 0) + (150 * (m.masteryLevel + 1));
            req = getReq(m.masteryLevel, m.masteryGrade);
        }
        return { character: characterName, pointsEarned: earned, hasLeveledUp: leveled };
    },

    makeAIDecision(game) {
        const ai = game.opponent;
        const player = game.player;
        const aiState = game.aiState || { lastState: null, lastAction: null, lastHPDiff: 0 };
        const currentAIDiff = (ai.pv / (ai.pv_maximum || ai.pv_max || 1)) - (player.pv / (player.pv_maximum || player.pv_max || 1));
        const reward = (currentAIDiff - aiState.lastHPDiff) * 100;
        aiState.lastHPDiff = currentAIDiff;
        if (aiState.lastState && aiState.lastAction !== null) {
            aiAgent.learn(aiState.lastState, aiState.lastAction, reward, ai, player, false);
        }
        const lastVerbose = aiState.lastAction !== null ? aiAgent.getVerboseActionName(aiState.lastAction) : null;
        const decision = aiAgent.chooseAction(ai, player, lastVerbose);
        aiState.lastState = decision.state;
        aiState.lastAction = decision.actionIndex;
        game.aiState = aiState;
        aiAgent.saveWeights();
        return aiAgent.getInternalActionName(decision.actionIndex);
    },

    recordGameOver(game, winner) { aiAgent.recordGameOver(game, winner); },

    applyWeekendEvent(game, eventName) {
        const p = game.player;
        const o = game.opponent;
        
        switch (eventName) {
            case "PV égaux":
                const avg = Math.round((p.pv + o.pv) / 2);
                p.pv = avg; p.pv_maximum = avg; p.pv_max = avg;
                o.pv = avg; o.pv_maximum = avg; o.pv_max = avg;
                break;
            case "Chargement /2":
                // Handled in handleAttack: gainSpe needs to be doubled or we just give initial charge
                // Let's implement it as a passive multiplier if possible, or simpler: start with 50%
                p.spe = 0.5; o.spe = 0.5;
                p.fastCharge = true; o.fastCharge = true; // Need to support this in handleAttack
                break;
            case "Sans défense":
                p.nodefense = true; o.nodefense = true;
                break;
            case "Sans objet":
                p.noobject = true; o.noobject = true;
                break;
            case "Points X2":
                // Handled in finalizeGame
                break;
            case "XP X2":
                // Handled in finalizeGame
                break;
            case "Rage":
                p.isRaging = true; o.isRaging = true;
                break;
            case "Armure fragile":
                p.fragileArmor = true; o.fragileArmor = true;
                break;
            case "Récupération rapide":
            case "Bénédiction":
                p.blessed = true; o.blessed = true;
                break;
            case "Malédiction":
                p.cursed = true; o.cursed = true;
                break;
        }
    }
};

module.exports = combatEngine;