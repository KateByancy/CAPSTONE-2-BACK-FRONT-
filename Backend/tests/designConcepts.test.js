const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const express = require('express');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const db = require('../config/db');
const query = (sql, values = []) => new Promise((resolve, reject) => {
    db.query(sql, values, (error, rows) => error ? reject(error) : resolve(rows));
});

test('design concepts migrate safely and stay isolated across projects for the same client', async t => {
    let server, uploadedImage, databaseCreated = false;
    // All fixtures live in a fresh database, never in the application's tables.
    const database = `concept_test_${process.pid}_${Date.now()}`;
    const originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'design-concept-test-only';
    async function start() {
        const app = express();
        app.use(express.json());
        app.use('/api/portfolio', require('../routes/portfolioRoutes'));
        app.use('/api/designs', require('../routes/designRoutes'));
        server = app.listen(0, '127.0.0.1');
        await new Promise(resolve => server.once('listening', resolve));
        return `http://127.0.0.1:${server.address().port}/api`;
    }
    try {
        await query(`CREATE DATABASE ${database}`);
        databaseCreated = true;
        await query(`USE ${database}`);
        await query('CREATE TABLE users (id INT PRIMARY KEY, fullname VARCHAR(150), role VARCHAR(20), password VARCHAR(255))');
        await query("INSERT INTO users VALUES (910001, 'Upload Test Admin', 'admin', 'ADMIN_ENV_AUTH'), (910002, 'Two Project Client', 'client', 'test-only'), (910003, 'Single Project Client', 'client', 'test-only'), (910004, 'Legacy Duplicate Client', 'client', 'test-only')");
        await query('CREATE TABLE bookings (id INT PRIMARY KEY, user_id INT, accepted_at DATETIME NULL) ENGINE=InnoDB');
        await query('INSERT INTO bookings VALUES (920001, 910002, NOW()), (920002, 910002, NOW()), (920003, 910003, NOW()), (920004, 910004, NOW()), (920005, 910003, NULL)');
        await query('CREATE TABLE designs (id INT AUTO_INCREMENT PRIMARY KEY, portfolio_id INT NULL, design_name VARCHAR(150) NOT NULL, design_type VARCHAR(100), image VARCHAR(255), description TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB');
        await query("INSERT INTO designs (design_name, image) VALUES ('Historical concept', '/existing.png')");
        const migrate = require('../migrations/designConcepts');
        await migrate(query);
        await query("INSERT INTO designs (user_id,title,image) VALUES (910002,'Ambiguous legacy','/ambiguous.png'),(910003,'Single project legacy','/single.png'),(910004,'Duplicate legacy','/duplicate.png'),(910004,'Duplicate legacy','/duplicate.png')");
        await migrate(query);
        await migrate(query);
        const historical = await query('SELECT * FROM designs ORDER BY id');
        assert.equal(historical.length, 5);
        assert.equal(historical[0].title, 'Historical concept');
        assert.equal(historical[0].image, '/existing.png');
        assert.equal(historical[0].project_id, null);
        assert.equal(historical[1].project_id, null);
        assert.equal(historical[2].project_id, 920003);
        assert.equal(historical[3].project_id, null);
        assert.equal(historical[4].project_id, null);
        t.diagnostic('Migration repeated safely; all 5 legacy concepts preserved; only unambiguous ownership assigned.');
        let base = await start();
        const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8X8AAAAASUVORK5CYII=', 'base64');
        const body = new FormData();
        body.set('image', new Blob([image], { type: 'image/png' }), 'concept.png');
        assert.equal((await fetch(`${base}/portfolio/upload`, { method: 'POST', body })).status, 401);
        const token = require('../utils/authTokens').issueAccessToken({ id: 910001, role: 'admin' });
        const uploaded = await fetch(`${base}/portfolio/upload`, { method: 'POST', body, headers: { Authorization: `Bearer ${token}` } });
        assert.equal(uploaded.status, 201);
        uploadedImage = (await uploaded.json()).image;
        const request = (url, method, payload) => fetch(`${base}/designs${url}`, { method, headers: { 'Content-Type': 'application/json' }, body: payload ? JSON.stringify(payload) : undefined });
        const payload = { project_id: 920001, user_id: 910002, title: 'Project A concept', description: 'Upload test', image: uploadedImage };
        assert.equal((await request('', 'POST', { ...payload, project_id: undefined })).status, 400);
        assert.equal((await request('', 'POST', { ...payload, project_id: 999999 })).status, 404);
        assert.equal((await request('', 'POST', { ...payload, project_id: 920005, user_id: 910003 })).status, 404);
        assert.equal((await request('', 'POST', { ...payload, user_id: 910003 })).status, 400);
        const saved = await request('', 'POST', payload);
        assert.equal(saved.status, 200);
        const conceptA = (await saved.json()).designId;
        assert.equal((await request('', 'POST', payload)).status, 409);
        // Identical content is valid in another project and is still a separate concept.
        const savedB = await request('', 'POST', { ...payload, project_id: 920002 });
        assert.equal(savedB.status, 200);
        const conceptB = (await savedB.json()).designId;
        const list = async id => {
            const response = await request(`?project_id=${id}`, 'GET');
            assert.equal(response.status, 200);
            return response.json();
        };
        assert.deepEqual((await list(920001)).map(row => row.id), [conceptA]);
        assert.deepEqual((await list(920002)).map(row => row.id), [conceptB]);
        assert.equal((await request('', 'GET')).status, 400);
        assert.equal((await request('?project_id=invalid', 'GET')).status, 400);
        assert.equal((await request(`/${conceptA}?project_id=920002`, 'GET')).status, 404);
        assert.equal((await request(`/${conceptA}?project_id=920002`, 'DELETE')).status, 404);
        assert.equal((await request(`/${conceptA}`, 'PUT', { ...payload, project_id: 920002, title: 'Wrong project' })).status, 404);
        assert.equal((await request(`/${conceptA}`, 'PUT', { ...payload, title: 'Updated A' })).status, 200);
        assert.equal((await list(920001))[0].title, 'Updated A');
        assert.equal((await list(920002))[0].title, 'Project A concept');
        const extra = await request('', 'POST', { ...payload, title: 'Extra A' });
        const extraId = (await extra.json()).designId;
        assert.equal((await request(`/${extraId}`, 'PUT', { ...payload, title: 'Updated A' })).status, 409);
        // Simultaneous identical POSTs must yield one row, not two.
        const concurrent = await Promise.all([request('', 'POST', { ...payload, title: 'Concurrent A' }), request('', 'POST', { ...payload, title: 'Concurrent A' })]);
        assert.deepEqual(concurrent.map(response => response.status).sort(), [200, 409]);
        assert.equal((await list(920001)).filter(row => row.title === 'Concurrent A').length, 1);
        await assert.rejects(query('INSERT INTO designs (project_id,title) VALUES (999999,?)', ['Orphan']), error => error.code === 'ER_NO_REFERENCED_ROW_2');
        await assert.rejects(query('DELETE FROM bookings WHERE id=920001'), error => error.code === 'ER_ROW_IS_REFERENCED_2');
        t.diagnostic('Projects 920001 and 920002 (same client) isolated; duplicate create/update and concurrent retries rejected; cross-project view/edit/delete rejected; foreign key enforced.');
        await new Promise(resolve => server.close(resolve));
        base = await start();
        const reloaded = (await list(920001)).find(row => row.id === conceptA);
        assert.equal(reloaded.project_id, 920001);
        assert.equal(reloaded.title, 'Updated A');
        assert.equal((await list(920002))[0].id, conceptB);
        const photo = await fetch(`${base.replace(/\/api$/, '')}${reloaded.image}`);
        assert.equal(photo.status, 200);
        assert.deepEqual(Buffer.from(await photo.arrayBuffer()), image);
        t.diagnostic('HTTP server restart/reload retained each project assignment; authenticated upload and image retrieval passed.');

        // Execute the real Admin component's hooks and event handlers against the live API.
        // Only booking/tracking fixtures and browser-only UI imports are stubbed.
        const frontend = path.join(__dirname, '../../Frontend');
        const ts = require(path.join(frontend, 'node_modules/typescript'));
        const React = require(path.join(frontend, 'node_modules/react'));
        const states = [], effects = [];
        let cursor = 0, firstRender = true;
        const hooks = { ...React,
            useState(initial) {
                const index = cursor++;
                if (!(index in states)) states[index] = initial;
                return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
            },
            useEffect(effect) { if (firstRender) effects.push(effect); }
        };
        const fixtureBookings = [920001, 920002].map(id => ({ id, user_id: 910002, accepted_at: '2026-01-01', client_name: 'Two Project Client', service_type: `Project ${id}`, status: 'Pending' }));
        const componentPath = path.join(frontend, 'src/app/admin/(dashboard)/build/page.tsx');
        const source = ts.transpileModule(await fs.readFile(componentPath, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
        const moduleValue = { exports: {} };
        const ImageUpload = () => null;
        const browserFetch = (url, options) => {
            if (url === `${base}/booking`) return Promise.resolve({ json: async () => ({ bookings: fixtureBookings }) });
            if (url === `${base}/tracking`) return Promise.resolve({ json: async () => ({ tracking: [] }) });
            return fetch(url, options);
        };
        require('node:vm').runInNewContext(source, {
            exports: moduleValue.exports, module: moduleValue, fetch: browserFetch, setTimeout,
            require(name) {
                if (name === 'react') return hooks;
                if (name === 'react/jsx-runtime') return require(path.join(frontend, 'node_modules/react/jsx-runtime'));
                if (name === 'lucide-react') return new Proxy({}, { get: () => () => null });
                if (name === '@/lib/api') return { getApiUrl: () => base };
                if (name === 'next/image') return () => null;
                if (name === '@/components/AdminImageUpload') return { __esModule: true, default: ImageUpload, imageSource: value => value };
                throw new Error(`Unexpected component import: ${name}`);
            }
        }, { filename: componentPath });
        const render = () => { cursor = 0; const tree = moduleValue.exports.default(); firstRender = false; return tree; };
        const nodes = tree => {
            if (!tree || typeof tree !== 'object') return [];
            if (Array.isArray(tree)) return tree.flatMap(nodes);
            return [tree, ...nodes(tree.props?.children)];
        };
        render();
        effects.forEach(effect => effect());
        const deadline = Date.now() + 10000;
        while (!states[0] && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 10));
        assert.equal(states[0], true);
        assert.equal(states[1].length, 2);
        assert.ok(states[1][0].concepts.some(row => row.id === conceptA));
        assert.ok(!states[1][0].concepts.some(row => row.id === conceptB));
        assert.deepEqual(Array.from(states[1][1].concepts, row => row.id), [conceptB]);
        let tree = render();
        nodes(tree).filter(node => node.type === 'button' && node.props.title === 'Add Design Concept')[0].props.onClick();
        tree = render();
        nodes(tree).find(node => node.type === 'input').props.onChange({ target: { value: 'Admin UI A' } });
        nodes(tree).find(node => node.type === ImageUpload).props.onChange(uploadedImage);
        tree = render();
        await nodes(tree).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
        assert.ok(states[1][0].concepts.some(row => row.title === 'Admin UI A'));
        assert.ok(!states[1][1].concepts.some(row => row.title === 'Admin UI A'));
        const fromDatabase = (await list(920001)).find(row => row.title === 'Admin UI A');
        assert.equal(fromDatabase.project_id, 920001);
        assert.equal((await list(920002)).some(row => row.title === 'Admin UI A'), false);
        // Use the actual View Photos/Edit controls to verify the PUT project payload.
        tree = render();
        nodes(tree).find(node => node.type === 'button' && node.props.children === 'View Photos').props.onClick();
        tree = render();
        nodes(tree).find(node => node.props?.['aria-label'] === 'Edit Admin UI A').props.onClick();
        tree = render();
        nodes(tree).find(node => node.type === 'input').props.onChange({ target: { value: 'Admin UI A edited' } });
        tree = render();
        await nodes(tree).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
        assert.equal((await list(920001)).find(row => row.id === fromDatabase.id).title, 'Admin UI A edited');
        assert.deepEqual(Array.from(states[1][1].concepts, row => row.id), [conceptB]);
        t.diagnostic('Real Admin component hook/handler test passed: project-scoped initial load, add, and edit update only Project A; Project B remains unchanged.');
    } finally {
        if (server) await new Promise(resolve => server.close(resolve));
        if (uploadedImage) await fs.unlink(path.join(__dirname, '../uploads/portfolio', path.basename(uploadedImage)));
        if (originalSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = originalSecret;
        if (databaseCreated) await query(`DROP DATABASE ${database}`);
        db.destroy();
    }
});
