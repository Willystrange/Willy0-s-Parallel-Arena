# Liste des Améliorations et Corrections Identifiées

## 1. Nettoyage du Code Mort
- [x] **`localStorage.js`** : Supprimé (logique de version déplacée dans `scripts/app.js`).
- [x] **`ml-agent.js`** : Supprimé (logique intégrée dans `scripts/combat-engine-server.js`).
- [x] **`start_mobile.js`** : Supprimé (script de dev mobile non utilisé).
- [x] **`ai_model.json`** : Déplacé dans `data/` et accès web bloqué via `server.js`.
- [x] **`special .png`** : Corrigé (renommé ou supprimé par l'utilisateur).
- [x] **Fichiers Orphelins** : `Paradoxeamelioration.html` et `.js` supprimés.

## 2. Architecture & Maintenance
- [ ] **Duplication des Trophées** :
    - *Problème :* La liste des récompenses est codée en dur dans `scripts/menu_principal.js` ET dans `data/trophy_road.json`.
    - *Action :* Créer un endpoint `/api/data/trophy-road` et faire charger cette config par le client.
- [ ] **Mapping des Objets** :
    - *Problème :* `ITEM_PROPERTY_MAP` est hardcodé dans `server.js`.
    - *Action :* Générer ce mapping dynamiquement à partir de `shop_items.json` et `equipments.json`.
- [ ] **Gestion de la Version** :
    - *Amélioration :* Lire la version depuis `package.json` au lieu de la hardcoder dans `App.game_version`.

## 3. Sécurité
- [ ] **Validation Serveur** :
    - *Critique :* `App.trophyVerif` dans `menu_principal.js` corrige les trophées côté client. Le serveur doit rejeter toute modification suspecte.
    - *Critique :* Les endpoints API (ex: `/api/trophy/claim`) doivent valider strictement les types de données (vérifier que `milestone` est un nombre positif).

## 4. Conventions & Qualité
- [x] **Nommage** : `Paradoxeamelioration` supprimé (c'était un fichier orphelin).
- [ ] **Code Dur** : Déplacer les textes et dialogues des scripts JS vers des fichiers JSON de traduction ou de configuration.