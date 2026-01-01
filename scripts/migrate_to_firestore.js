const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// 1. Initialisation
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const serviceAccount = require(path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} else {
    // Try multiple paths
    const possiblePaths = ['./serviceAccountKey.json', '../serviceAccountKey.json'];
    let found = false;
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            const serviceAccount = require(path.resolve(p));
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
            found = true;
            break;
        }
    }
    if (!found) {
        console.error("❌ Fichier serviceAccountKey.json introuvable !");
        process.exit(1);
    }
}

const db = admin.firestore();

async function migrate() {
    console.log("🚀 Démarrage de la migration vers Firestore...");

    // --- MIGRATION UTILISATEURS ---
    const usersPath = path.join(__dirname, '../users_data.json');
    if (fs.existsSync(usersPath)) {
        const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
        const batchSize = 400; // Limite Firestore par batch
        let batch = db.batch();
        let count = 0;
        let total = 0;

        console.log(`📦 Envoi des utilisateurs...`);
        for (const [uid, userData] of Object.entries(users)) {
            const userRef = db.collection('users').doc(uid);
            batch.set(userRef, userData, { merge: true });
            count++;
            total++;

            if (count >= batchSize) {
                await batch.commit();
                console.log(`   ✅ ${total} utilisateurs migrés...`);
                batch = db.batch();
                count = 0;
            }
        }
        if (count > 0) await batch.commit();
        console.log(`🎉 Total : ${total} utilisateurs migrés.`);
    } else {
        console.log("⚠️ users_data.json introuvable.");
    }

    // --- MIGRATION NEWS ---
    const newsPath = path.join(__dirname, '../news.json');
    if (fs.existsSync(newsPath)) {
        const news = JSON.parse(fs.readFileSync(newsPath, 'utf8'));
        await db.collection('settings').doc('news').set({ items: news });
        console.log("📰 News migrées.");
    }

    // --- MIGRATION CONFIG SERVEUR ---
    const configPath = path.join(__dirname, '../server_config.json');
    if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        await db.collection('settings').doc('config').set(config);
        console.log("⚙️ Configuration serveur migrée.");
    }

    // --- MIGRATION AI MODEL ---
    const aiPath = path.join(__dirname, '../data/ai_model.json');
    if (fs.existsSync(aiPath)) {
        try {
            const ai = JSON.parse(fs.readFileSync(aiPath, 'utf8'));
            // AI model can be huge, let's split it by key if needed, or store as one doc if < 1MB
            await db.collection('settings').doc('ai_model').set(ai);
            console.log("🧠 Modèle AI migré.");
        } catch (e) {
            console.warn("⚠️ Modèle AI trop gros ou erreur :", e.message);
        }
    }

    console.log("\n✅ MIGRATION TERMINÉE AVEC SUCCÈS !");
    process.exit(0);
}

migrate().catch(console.error);
