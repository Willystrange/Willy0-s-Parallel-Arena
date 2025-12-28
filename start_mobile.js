const { spawn, execSync } = require('child_process');

console.log("\n🚀 Lancement de Willy0's Parallel Arena (Mode Pinggy) ...");

// 0. Nettoyer le port 3000
try {
    execSync('fuser -k 3000/tcp');
} catch (e) {}

// 1. Lancer le serveur local
const server = spawn('node', ['server.js'], { stdio: 'inherit' });

console.log("2️⃣  Connexion au tunnel Pinggy...");

// 2. Lancer le tunnel Pinggy
// L'option StrictHostKeyChecking=no empêche la question "Are you sure..."
// L'option PasswordAuthentication=no empêche de demander un mot de passe (si ça échoue, ça coupe direct)
const tunnel = spawn('ssh', [
    '-o', 'StrictHostKeyChecking=no',
    '-p', '443', 
    '-R0:localhost:3000', 
    '-t', // Force le mode interactif pour voir le QR Code de Pinggy
    'a.pinggy.io'
], { stdio: 'inherit' });

process.on('SIGINT', () => {
    try { execSync('fuser -k 3000/tcp'); } catch(e){}
    server.kill();
    tunnel.kill();
    process.exit();
});