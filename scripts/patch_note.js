window.App = window.App || {};

// --- Navigation et démarrage ---
App.startGameIfStarted = function() {
    const userData = getUserData();
    if (userData.partie_commencee) {
        loadPage('combat');
    } else if (userData.partie_commencee_weekend) {
        loadPage('combat-weekend');
    }
};
App.startGameIfStarted();

// --- Patch Notes Logic ---
App.patchNotesData = null;

App.loadPatchNotes = async function() {
    if (App.patchNotesData) return App.patchNotesData;
    
    try {
        const response = await fetch('/api/data/patch-notes?v=' + Date.now());
        App.patchNotesData = await response.json();
        return App.patchNotesData;
    } catch (e) {
        console.error("Erreur chargement patch notes:", e);
        return [];
    }
};

App.renderPatchNotes = async function() {
    const container = document.getElementById('patch-notes-container');
    if (!container) return;
    
    const notes = await App.loadPatchNotes();
    container.innerHTML = ''; // Clear existing
    
    notes.forEach(note => {
        const lang = App.currentLang || 'fr';
        // Fallback to FR if EN is missing or empty (though we duplicated it, so it should be fine)
        const content = (note[lang] && note[lang].trim() !== "") ? note[lang] : note['fr'];
        
        const dateObj = new Date(note.date);
        const dateStr = dateObj.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US');
        const timeStr = dateObj.toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
        
        const title = App.t('patch_notes.version', { version: note.version });
        const meta = App.t('patch_notes.published_on', { date: dateStr, time: timeStr });
        
        const block = document.createElement('div');
        block.className = 'update-block';
        block.setAttribute('data-type', note.type);
        block.setAttribute('data-datetime', note.date);
        
        block.innerHTML = `
            <h1 id="version-${note.version}">${title}</h1>
            <p class="update-meta">${meta}</p>
            <ul id="notes-${note.version}" class="note-list">
                ${content}
            </ul>
        `;
        
        container.appendChild(block);
    });
};

// --- Event Handling ---
App.handleVersionClick = function(event) {
    // Traverse up to find h1 if clicked on child
    const target = event.target.closest('h1[id^="version-"]');
    if (target) {
        const version = target.id.split('-').pop();
        const notes = document.getElementById(`notes-${version}`);

        if (!notes) return;

        if (notes.classList.contains('open')) {
            notes.classList.remove('open');
        } else {
            // Close others? Optional. The original script did close others.
            document.querySelectorAll('.note-list.open').forEach(list => list.classList.remove('open'));
            notes.classList.add('open');
        }
    }
};

// --- Initialization ---
document.addEventListener('click', App.handleVersionClick);

// Handle translations
window.addEventListener('translationsLoaded', () => {
    App.translatePage(); // For static buttons
    App.renderPatchNotes(); // For dynamic content
});

// Initial render if translations ready (or fallback)
if (Object.keys(App.translations || {}).length > 0) {
    App.renderPatchNotes();
} else {
    // Try to render with default lang immediately, will update on event
    App.renderPatchNotes(); 
}