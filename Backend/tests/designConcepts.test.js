const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const express = require('express');
require('dotenv').config({ path: require('node:path').join(__dirname, '../.env'), quiet: true });
const db = require('../config/db');
const query = (sql, values = []) => new Promise((resolve, reject) => {
    db.query(sql, values, (error, rows) => error ? reject(error) : resolve(rows));
});

test('legacy design storage migrates and existing upload/save/reload retains the correct client', async () => {
    let server, uploadedImage;
    const originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'design-concept-test-only';
    async function start() {
        delete require.cache[require.resolve('../controllers/designController')];
        delete require.cache[require.resolve('../routes/designRoutes')];
        const app = express();
        app.use(express.json());
        app.use('/api/portfolio', require('../routes/portfolioRoutes'));
        app.use('/api/designs', require('../routes/designRoutes'));
        server = app.listen(0, '127.0.0.1');
        await new Promise(resolve => server.once('listening', resolve));
        return `http://127.0.0.1:${server.address().port}/api`;
    }
    try {
        await query("CREATE TEMPORARY TABLE users (id INT PRIMARY KEY, fullname VARCHAR(150), role VARCHAR(20), password VARCHAR(255))");
        await query("INSERT INTO users VALUES (910001, 'Upload Test Admin', 'admin', 'ADMIN_ENV_AUTH'), (910002, 'Upload Test Client', 'client', 'test-only')");
        await query('CREATE TEMPORARY TABLE designs (id INT AUTO_INCREMENT PRIMARY KEY, portfolio_id INT NULL, design_name VARCHAR(150) NOT NULL, design_type VARCHAR(100), image VARCHAR(255), description TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
        await query("INSERT INTO designs (design_name, image) VALUES ('Historical concept', '/existing.png')");
        await assert.rejects(query('INSERT INTO designs (user_id,title,description,image) VALUES (?,?,?,?)', [910002, 'New concept', '', '/image.png']), error => error.code === 'ER_BAD_FIELD_ERROR');
        const migrate = require('../migrations/designConcepts');
        await migrate(query);
        await migrate(query);
        const [historical] = await query('SELECT * FROM designs WHERE id=1');
        assert.equal(historical.title, 'Historical concept');
        assert.equal(historical.image, '/existing.png');
        assert.equal(historical.user_id, null);
        let base = await start();
        const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8X8AAAAASUVORK5CYII=', 'base64');
        const body = new FormData();
        body.set('image', new Blob([image], { type: 'image/png' }), 'concept.png');
        assert.equal((await fetch(`${base}/portfolio/upload`, { method: 'POST', body })).status, 401);
        const token = require('../utils/authTokens').issueAccessToken({ id: 910001, role: 'admin' });
        const uploaded = await fetch(`${base}/portfolio/upload`, { method: 'POST', body, headers: { Authorization: `Bearer ${token}` } });
        assert.equal(uploaded.status, 201);
        uploadedImage = (await uploaded.json()).image;
        const saved = await fetch(`${base}/designs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: 910002, title: 'Project update', description: 'Upload test', image: uploadedImage }) });
        assert.equal(saved.status, 200);
        const result = await saved.json();
        assert.equal(result.success, true);
        await new Promise(resolve => server.close(resolve));
        base = await start();
        const response = await fetch(`${base}/designs`);
        assert.equal(response.status, 200);
        const record = (await response.json()).find(item => item.id === result.designId);
        assert.equal(record.user_id, 910002);
        assert.equal(record.title, 'Project update');
        assert.equal(record.image, uploadedImage);
        const photo = await fetch(`${base.replace(/\/api$/, '')}${record.image}`);
        assert.equal(photo.status, 200);
        assert.deepEqual(Buffer.from(await photo.arrayBuffer()), image);
    } finally {
        if (server) await new Promise(resolve => server.close(resolve));
        if (uploadedImage) await fs.unlink(path.join(__dirname, '../uploads/portfolio', path.basename(uploadedImage)));
        if (originalSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = originalSecret;
        db.destroy();
    }
});
