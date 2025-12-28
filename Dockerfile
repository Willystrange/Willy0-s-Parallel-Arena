# Utiliser une image Node.js légère
FROM node:18-slim

# Créer le répertoire de l'application
WORKDIR /app

# Copier package.json et package-lock.json (si présent)
COPY package*.json ./

# Installer les dépendances
RUN npm install --production

# Copier le reste des fichiers du projet
COPY . .

# Exposer le port 3000
EXPOSE 3000

# Lancer le serveur
CMD ["npm", "start"]
