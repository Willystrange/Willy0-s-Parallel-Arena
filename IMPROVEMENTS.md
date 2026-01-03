# Liste des Améliorations et Corrections Identifiées

## 1. Nettoyage du Code Mort
- [x] **`localStorage.js`** : Supprimé (logique de version déplacée dans `scripts/app.js`).
- [x] **`ml-agent.js`** : Supprimé (logique intégrée dans `scripts/combat-engine-server.js`).
- [x] **`start_mobile.js`** : Supprimé (script de dev mobile non utilisé).
- [x] **`ai_model.json`** : Déplacé dans `data/` et accès web bloqué via `server.js`.
- [x] **`special .png`** : Corrigé (renommé ou supprimé par l'utilisateur).
- [x] **Fichiers Orphelins** : `Paradoxeamelioration.html` et `.js` supprimés.

## 2. Architecture & Maintenance
- [x] **Duplication des Trophées** : Résolu (endpoint `/api/data/trophy-road` créé et utilisé par le client).
- [x] **Mapping des Objets** :
    - *Problème :* `ITEM_PROPERTY_MAP` est hardcodé dans `server.js`.
    - *Action :* Généré dynamiquement à partir de `shop_items.json`.
- [x] **Gestion de la Version** :
    - *Amélioration :* Lire la version depuis `package.json` au lieu de la hardcoder dans `App.game_version`.

## 3. Sécurité
- [x] **Validation Serveur** :
    - [x] Sécurisation de `/api/trophy/claim` : Validation stricte des types de données (milestone entier positif) et vérification de l'existence de la récompense.
    - [x] Restriction des modifications client : Suppression de `tropheesMax` des champs modifiables par le client pour prévenir la triche.
- [ ] **Système de Trophées** :

## 4. Conventions & Qualité
- [x] **Nommage** : `Paradoxeamelioration` supprimé (c'était un fichier orphelin).
- [ ] **Code Dur** : Déplacer les textes et dialogues des scripts JS vers des fichiers JSON de traduction ou de configuration.