class QLearningAgent {
    constructor(name, epsilon = 0.1, alpha = 0.1, gamma = 0.9) {
        this.name = name;
        this.epsilon = epsilon; // Exploration rate
        this.alpha = alpha;     // Learning rate
        this.gamma = gamma;     // Discount factor
        this.qTable = {};       // State -> [Q(Attack), Q(Defend), Q(Special)]
        this.loadWeights();
        this.lastState = null;
        this.lastAction = null;
    }

    getStateKey(me, opponent) {
        // 0. Opponent Identity (Crucial for recognizing specific threats)
        const oppName = opponent.name;

        // 1. HP Difference
        const myHP = me.pv / (me.pv_maximum || me.pv_max);
        const oppHP = opponent.pv / (opponent.pv_maximum || opponent.pv_max);
        const diff = myHP - oppHP;
        let hpState = "EQ"; // Equal
        if (diff < -0.3) hpState = "VD"; // Very Disadvantaged
        else if (diff < -0.1) hpState = "D"; // Disadvantaged
        else if (diff > 0.3) hpState = "VA"; // Very Advantaged
        else if (diff > 0.1) hpState = "A";  // Advantaged

        // 2. My Energy
        const mySpe = me.spe >= 1.0 ? "RDY" : "CHG"; // Ready / Charging

        // 3. Opponent Energy (Critical for anticipating Specials)
        const oppSpe = opponent.spe >= 1.0 ? "RDY" : "CHG";

        // 4. Can Defend
        const canDefend = (me.defense_droit === 0 && me.spe >= 0.1) ? "YES" : "NO";

        return `${oppName}_${hpState}_${mySpe}_${oppSpe}_${canDefend}`;
    }

    getQValues(state) {
        if (!this.qTable[state]) {
            this.qTable[state] = [0, 0, 0]; // [Attack, Defend, Special]
        }
        return this.qTable[state];
    }

    chooseAction(me, opponent) {
        const state = this.getStateKey(me, opponent);
        this.lastState = state;
        
        // Valid actions check
        const validActions = [0]; // Attack is always valid
        if (me.defense_droit === 0 && me.spe >= 0.1) validActions.push(1); // Defend
        if (me.spe >= 1.0 && me.inconnu_super === 0) validActions.push(2); // Special

        // Exploration
        if (Math.random() < this.epsilon) {
            const randomIndex = Math.floor(Math.random() * validActions.length);
            this.lastAction = validActions[randomIndex];
            return this.getActionName(this.lastAction);
        }

        // Exploitation
        const qValues = this.getQValues(state);
        let bestAction = validActions[0];
        let maxQ = -Infinity;

        for (const action of validActions) {
            if (qValues[action] > maxQ) {
                maxQ = qValues[action];
                bestAction = action;
            }
        }

        this.lastAction = bestAction;
        return this.getActionName(this.lastAction);
    }

    learn(reward, me, opponent, isTerminal = false) {
        if (!this.lastState || this.lastAction === null) return;

        const qValues = this.qTable[this.lastState];
        const currentQ = qValues[this.lastAction];

        let maxNextQ = 0;
        if (!isTerminal) {
            const nextState = this.getStateKey(me, opponent);
            const nextQValues = this.getQValues(nextState);
            maxNextQ = Math.max(...nextQValues);
        }

        // Q-Learning Update Rule
        // Q(s,a) = Q(s,a) + alpha * (r + gamma * max(Q(s', a')) - Q(s,a))
        const newQ = currentQ + this.alpha * (reward + this.gamma * maxNextQ - currentQ);
        this.qTable[this.lastState][this.lastAction] = newQ;
    }

    getActionName(actionIndex) {
        switch (actionIndex) {
            case 0: return 'attacker';
            case 1: return 'se défendre';
            case 2: return 'utiliser capacité spéciale';
        }
    }

        saveWeights() {
            const payload = {
                qTable: this.qTable,
                epsilon: this.epsilon,
                totalSims: this.totalSims || 0
            };
            return fetch('/api/ai/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: payload,
                    stats: window.gauntletStats || {},
                    characterName: "UNIVERSAL"
                })
            })
            .then(res => res.json())
            .then(data => {
                if(data.success) console.log("IA Universelle sauvegardée.");
            })
            .catch(e => console.error(e));
        }

        async loadWeights() {
            try {
                const res = await fetch('/api/ai/load');
                const data = await res.json();
                if (data.success && data.models) {
                    const modelData = data.models['UNIVERSAL'];
                    if (modelData && modelData.qTable) {
                        this.qTable = modelData.qTable;
                        this.epsilon = modelData.epsilon !== undefined ? modelData.epsilon : this.epsilon;
                        this.totalSims = modelData.totalSims || 0;
                    }
                    return;
                }
            } catch (e) {}
            const data = localStorage.getItem('ql_agent_UNIVERSAL');
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.qTable) {
                        this.qTable = parsed.qTable;
                        this.epsilon = parsed.epsilon !== undefined ? parsed.epsilon : this.epsilon;
                    } else { this.qTable = parsed; }
                } catch(e) { this.qTable = {}; }
            }
        }
    
    reset() {
        this.lastState = null;
        this.lastAction = null;
    }
}

window.QLearningAgent = QLearningAgent;
