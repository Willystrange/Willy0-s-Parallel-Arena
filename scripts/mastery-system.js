window.App = window.App || {};

App.MasterySystem = (function() {

    // Configuration du système de maîtrise
    const config = {
        // Grades requis pour passer au niveau suivant. Index 0 = niveau 0 -> 1, etc.
        gradesPerLevel: [3, 4, 5, 5, 5, 10], 
        // Points de base pour le premier grade. La difficulté augmentera à partir de là.
        basePointsPerGrade: 100 
    };

    const masteryLevelNames = ["Écho Temporel", "Voyageur Dimensionnel", "Gardien du Paradoxe", "Conquérant des Failles", "Maître des Réalités", "Titan Parallèle", "Singularité Vivante"];
    const masteryGradeNames = ["Fragment", "Éclat", "Noyau", "Essence", "Nexus", "Harmonie", "Zénith", "Apogée", "Infinité", "Singularité"];

    /**
     * Calcule le nombre de points de maîtrise requis pour atteindre le grade/niveau suivant.
     * La courbe est exponentielle pour que la progression soit de plus en plus difficile.
     * @param {number} level - Le niveau de maîtrise actuel (0-5).
     * @param {number} grade - Le grade actuel dans ce niveau.
     * @returns {number} - Le nombre de points requis.
     */
    function getPointsRequired(level, grade) {
        const levelMultiplier = Math.pow(1.6, level); // Difficulté accrue par niveau
        const gradeMultiplier = 1 + (grade * 0.25);   // Difficulté accrue par grade
        return Math.floor(config.basePointsPerGrade * levelMultiplier * gradeMultiplier);
    }

    // --- UI HELPER ---
    function displayMasteryInfo(containerId) {
        let result = null;
        try {
            const stored = sessionStorage.getItem('masteryGameResult');
            if (stored) result = JSON.parse(stored);
        } catch (e) {
            console.error("Error parsing mastery result:", e);
        }

        if (!result) return 0;

        const container = document.getElementById(containerId);
        if (!container) return 0;
        
        // On suppose que App.userData est à jour via getUserData() appelé ailleurs ou ici si besoin
        // Mais pour l'affichage pur, on peut relire le localStorage pour être sûr
        const userData = JSON.parse(localStorage.getItem('userData')) || {};
        if (!userData || !userData.characters) return 0;

        const characterData = userData.characters[result.character] || {};
        const masteryLevel = characterData.masteryLevel || 0;
        const masteryGrade = characterData.masteryGrade || 0;
        const masteryPoints = characterData.masteryPoints || 0;

        const levelName = masteryLevelNames[masteryLevel] || `Niveau ${masteryLevel}`;
        const gradeName = masteryGradeNames[masteryGrade] || `Grade ${masteryGrade + 1}`;
        const masteryFullName = `${levelName} ${gradeName}`;

        const pointsRequired = getPointsRequired(masteryLevel, masteryGrade);
        const progressPercentage = pointsRequired > 0 ? Math.min((masteryPoints / pointsRequired) * 100, 100) : 0;

        const title = result.hasLeveledUp 
            ? `Maîtrise de ${result.character} augmentée !`
            : `Maîtrise de ${result.character}`;

        const masteryElement = document.createElement('div');
        masteryElement.className = 'reward mastery-reward show';
        
        masteryElement.innerHTML = `
            <div class="mastery-display">
                <div class="mastery-character-name">${title}</div>
                <div class="mastery-rank">${masteryFullName}</div>
                <div class="mastery-progress-bar-container">
                    <div class="mastery-progress-bar" style="width: ${progressPercentage}%;"></div>
                </div>
                <div class="mastery-points">${masteryPoints} / ${pointsRequired} pts</div>
                <p style="text-align: center; margin-top: 10px; color: #4CAF50;">+${result.pointsEarned} XP de maîtrise</p>
            </div>
        `;
        
        let delay = 3500;
        setTimeout(() => {
            container.appendChild(masteryElement);
        }, delay);

        sessionStorage.removeItem('masteryGameResult');
        return delay + 1500;
    }

    // Exposer la fonction publique
    return {
        displayMasteryInfo: displayMasteryInfo
    };

})();