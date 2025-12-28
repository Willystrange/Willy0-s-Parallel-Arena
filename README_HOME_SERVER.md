# Willy0's Parallel Arena - Home Server Setup

Ce projet est maintenant configuré pour tourner sur votre propre serveur maison.

## Option 1 : Avec Docker (Recommandé)

1. Installez Docker sur votre serveur.
2. Placez-vous dans le dossier du projet.
3. Construisez l'image :
   ```bash
   docker build -t parallel-arena .
   ```
4. Lancez le conteneur :
   ```bash
   docker run -d -p 3000:3000 --name arena parallel-arena
   ```
5. Accédez au jeu via `http://<IP_DE_VOTRE_SERVEUR>:3000`.

## Option 2 : Avec Node.js (Directement)

1. Installez Node.js sur votre serveur.
2. Installez les dépendances :
   ```bash
   npm install
   ```
3. Lancez le serveur :
   ```bash
   npm start
   ```
4. Accédez au jeu via `http://<IP_DE_VOTRE_SERVEUR>:3000`.

## Configuration

- Le serveur utilise le port **3000** par défaut. Vous pouvez le changer via la variable d'environnement `PORT`.
- Le jeu continue d'utiliser **Firebase** pour l'authentification et la base de données cloud. Assurez-vous que votre serveur a un accès internet.
- Socket.io est maintenant configuré pour se connecter automatiquement à l'adresse de votre serveur.

## Notes sur Firebase

Si vous souhaitez être 100% indépendant de Firebase, vous devrez migrer la logique d'authentification et de stockage dans `server.js`. Pour l'instant, cette configuration permet une transition facile vers un auto-hébergement des fichiers et du socket temps-réel.
