const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
    isPortfolioRequest,
    isFinishedWorksRequest,
    isDesignInspirationsRequest,
    isUnavailableFinishedCategory,
    resolveShowcaseResponse,
    safeImage,
    encodePortfolio,
    decodePortfolio,
    ACTUAL_FINISHED_WORKS,
    CATALOG_DESIGNS
} = require('../services/portfolioChat');

test('safeImage validates local and remote images including spaces and excludes unsafe paths', () => {
    assert.equal(safeImage('/designs/1.jpg'), true);
    assert.equal(safeImage('/designs/bronze kitchen.jpg'), true);
    assert.equal(safeImage('/designs/silver living room.jpg'), true);
    assert.equal(safeImage('https://example.com/designs/photo.jpg'), true);
    assert.equal(safeImage('/designs/<script>'), false);
    assert.equal(safeImage('/designs/test"quote'), false);
    assert.equal(safeImage(null), false);
    assert.equal(safeImage(undefined), false);
});

test('isFinishedWorksRequest detects client questions for completed and actual finished projects', () => {
    const finishedQueries = [
        'Can I see finished works?',
        'Show me completed projects',
        'Patingin ng mga natapos na gawa ni Marc',
        'Do you have actual finished works photos?',
        'What are the past projects?',
        'Show me 1 to 7 photos of finished builds',
        'Mga nagawa na ni Marc Rossel',
    ];
    for (const q of finishedQueries) {
        assert.equal(isFinishedWorksRequest(q), true, `Expected "${q}" to be finished works request`);
    }

    const designQueries = [
        'What are your design ideas?',
        'Show me actual designs',
        'Bronze Kitchen design details',
        'Do you have kitchen design ideas?',
    ];
    for (const q of designQueries) {
        assert.equal(isFinishedWorksRequest(q), false, `Expected "${q}" NOT to be finished works request`);
    }
});

test('isDesignInspirationsRequest detects design ideas, catalog concepts, and actual designs', () => {
    const designQueries = [
        'What are your design ideas?',
        'Show me actual designs',
        'Can I see catalog designs?',
        'Bronze Kitchen',
        'Silver Office',
        'Show me kitchen design ideas',
        'Patingin ng mga disenyo',
        'What design concepts do you have?',
        'Sample designs please',
    ];
    for (const q of designQueries) {
        assert.equal(isDesignInspirationsRequest(q), true, `Expected "${q}" to be design inspirations request`);
    }

    const finishedQueries = [
        'Show me finished works',
        'Completed projects please',
        'Patingin ng mga natapos na gawa',
    ];
    for (const q of finishedQueries) {
        assert.equal(isDesignInspirationsRequest(q), false, `Expected "${q}" NOT to be design inspirations request`);
    }
});

test('isUnavailableFinishedCategory identifies requests for finished categories that do not exist', () => {
    assert.equal(isUnavailableFinishedCategory('Show me finished kiosk projects'), true);
    assert.equal(isUnavailableFinishedCategory('Do you have completed mural works?'), true);
    assert.equal(isUnavailableFinishedCategory('Natapos na decal projects'), true);
    assert.equal(isUnavailableFinishedCategory('Show me finished works'), false);
    assert.equal(isUnavailableFinishedCategory('Kitchen design ideas'), false);
});

test('resolveShowcaseResponse delivers 1-7.jpg for finished works and catalog designs for design ideas', async () => {
    // 1. Finished works returns 1 to 7 photos
    const finishedRes = await resolveShowcaseResponse('Show me finished works');
    assert.ok(finishedRes);
    assert.equal(finishedRes.showcaseType, 'finished_works');
    assert.equal(finishedRes.items.length, 7);
    assert.equal(finishedRes.items[0].image, '/designs/1.jpg');
    assert.equal(finishedRes.items[6].image, '/designs/7.jpg');
    assert.match(finishedRes.text, /actual completed projects/i);

    // 2. Design ideas / actual design returns catalog designs (Bronze Kitchen, Silver Office, etc.)
    const designRes = await resolveShowcaseResponse('What are the actual designs?');
    assert.ok(designRes);
    assert.equal(designRes.showcaseType, 'catalog_designs');
    assert.ok(designRes.items.some(item => item.title === 'Bronze Kitchen'));
    assert.ok(designRes.items.some(item => item.title === 'Silver Office'));
    assert.match(designRes.text, /catalog design inspirations/i);

    // 3. Room-specific design ideas (e.g., kitchen) filters for kitchen catalog items
    const kitchenRes = await resolveShowcaseResponse('Kitchen design ideas please');
    assert.ok(kitchenRes);
    assert.equal(kitchenRes.showcaseType, 'catalog_designs');
    assert.ok(kitchenRes.items.every(item => item.title.includes('Kitchen')));

    // 4. Unavailable finished work category informs client honestly with no fake images
    const kioskRes = await resolveShowcaseResponse('Can I see finished kiosk projects?');
    assert.ok(kioskRes);
    assert.equal(kioskRes.items.length, 0);
    assert.match(kioskRes.text, /do not have photos of completed projects for that specific category/i);
});

test('encodePortfolio and decodePortfolio handle both modern showcase items and legacy IDs', () => {
    // Modern showcase with items
    const items = [
        { id: 1, title: 'Finished Project 1', image: '/designs/1.jpg' },
        { id: 2, title: 'Finished Project 2', image: '/designs/2.jpg' },
    ];
    const encoded = encodePortfolio('Finished works text', items, 'finished_works');
    const decoded = decodePortfolio({ sender: 'bot', message: encoded });
    assert.ok(decoded);
    assert.equal(decoded.text, 'Finished works text');
    assert.equal(decoded.showcaseType, 'finished_works');
    assert.equal(decoded.items.length, 2);
    assert.equal(decoded.items[0].image, '/designs/1.jpg');

    // Legacy portfolio format with ids
    const legacyEncoded = JSON.stringify({ type: 'marc_portfolio_v1', text: 'Legacy text', ids: [1, 2, 3] });
    const legacyDecoded = decodePortfolio({ sender: 'bot', message: legacyEncoded });
    assert.ok(legacyDecoded);
    assert.equal(legacyDecoded.text, 'Legacy text');
    assert.deepEqual(legacyDecoded.ids, [1, 2, 3]);

    // Non-bot sender is ignored
    assert.equal(decodePortfolio({ sender: 'client', message: encoded }), null);
    // Malformed JSON is ignored
    assert.equal(decodePortfolio({ sender: 'bot', message: 'not-json' }), null);
});

