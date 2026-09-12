const path = require('node:path');
const fs = require('node:fs/promises');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
const db = require('./config/db');

async function importInspirations() {
    const publicDirectory = path.resolve(__dirname, '../Frontend/public');
    const items = JSON.parse(await fs.readFile(path.join(publicDirectory, 'data/inspirations.json'), 'utf8'));
    const connection = db.promise();
    let inserted = 0;
    try {
        await connection.beginTransaction();
        for (const item of items) {
            const imagePath = path.resolve(publicDirectory, item.image.replace(/^\//, ''));
            if (!imagePath.startsWith(publicDirectory + path.sep)) throw new Error('Invalid inspiration image path.');
            await fs.access(imagePath);
            const [existing] = await connection.query('SELECT id FROM portfolio WHERE image = ? LIMIT 1', [item.image]);
            if (existing.length) continue;
            await connection.query('INSERT INTO portfolio (title, category, description, image) VALUES (?, ?, ?, ?)',
                [item.title, item.category, item.description, item.image]);
            inserted++;
        }
        await connection.commit();
        console.log(`Imported ${inserted} inspiration entries. Existing entries preserved.`);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        await connection.end();
    }
}

importInspirations().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
