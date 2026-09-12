require('dotenv').config({ quiet: true });
const fs = require('node:fs/promises');
const path = require('node:path');
const db = require('./config/db');
const query = (sql, values = []) => new Promise((resolve, reject) => db.query(sql, values, (error, rows) => error ? reject(error) : resolve(rows)));
(async () => {
    try {
        await query(require('./migrations/avatars'));
        const directory = path.join(__dirname, 'uploads/avatars');
        const files = await fs.readdir(directory).catch(error => { if (error.code === 'ENOENT') return []; throw error; });
        let imported = 0;
        for (const file of files) {
            if (!/^\d+\.image$/.test(file)) continue;
            const data = await fs.readFile(path.join(directory, file));
            const type = data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png'
                : data[0] === 255 && data[1] === 216 && data[2] === 255 ? 'image/jpeg'
                : data.toString('ascii',0,4) === 'RIFF' && data.toString('ascii',8,12) === 'WEBP' ? 'image/webp' : null;
            if (!type) continue;
            const result = await query('INSERT IGNORE INTO profile_avatars (user_id, image, content_type) VALUES (?,?,?)', [Number(file.split('.')[0]), data, type]);
            imported += result.affectedRows;
        }
        console.log(`Profile picture storage ready; ${imported} existing pictures preserved. Original files retained.`);
    } catch (error) { console.error(error.message); process.exitCode = 1; }
    finally { db.destroy(); }
})();
