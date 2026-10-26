const ACTUAL_FINISHED_WORKS = [
    { id: 1, title: 'Finished Project 1', category: 'Living Room', image: '/designs/1.jpg' },
    { id: 2, title: 'Finished Project 2', category: 'Kitchen', image: '/designs/2.jpg' },
    { id: 3, title: 'Finished Project 3', category: 'Living Room', image: '/designs/3.jpg' },
    { id: 4, title: 'Finished Project 4', category: 'Bed Room', image: '/designs/4.jpg' },
    { id: 5, title: 'Finished Project 5', category: 'Living Room', image: '/designs/5.jpg' },
    { id: 6, title: 'Finished Project 6', category: 'Kitchen', image: '/designs/6.jpg' },
    { id: 7, title: 'Finished Project 7', category: 'Living Room', image: '/designs/7.jpg' },
];

const CATALOG_DESIGNS = [
    { id: 11, title: 'Bronze Kitchen', category: 'Kitchen', image: '/designs/bronze kitchen.jpg' },
    { id: 12, title: 'Bronze Living Room', category: 'Living Room', image: '/designs/bronze living room.jpg' },
    { id: 13, title: 'Bronze Office', category: 'Office', image: '/designs/bronze office.jpg' },
    { id: 14, title: 'Silver Living Room', category: 'Living Room', image: '/designs/silver living room.jpg' },
    { id: 15, title: 'Silver Kitchen', category: 'Kitchen', image: '/designs/silver kitchen.jpg' },
    { id: 16, title: 'Silver Office', category: 'Office', image: '/designs/silver office.jpg' },
    { id: 17, title: 'Silver Bedroom', category: 'Bed Room', image: '/designs/silver bedroom.jpg' },
    { id: 18, title: 'Gold Kitchen', category: 'Kitchen', image: '/designs/gold kitchen.jpg' },
    { id: 19, title: 'Gold Living Room', category: 'Living Room', image: '/designs/gold living room.jpg' },
];

function safeImage(value) {
    if (typeof value !== "string") return false;
    if (/^https?:\/\/[^\s]+$/i.test(value)) return true;
    if (value.startsWith('/') && !value.startsWith('//') && !/[<>"'\\]/.test(value)) return true;
    return false;
}

function isFinishedWorksRequest(message) {
    const text = String(message || '').toLowerCase();
    if (/\b(?:finished|completed|past|previous|accomplished|installed)\s+(?:works?|projects?|builds?|jobs?|photos?|pictures?|images?)\b/i.test(text)) return true;
    if (/\b(?:actual|real)\s+(?:finished|completed|works?|projects?|builds?|photos?|pictures?)\b/i.test(text)) return true;
    if (/\b(?:natapos|tapos|nakaraan|aktwal|actual)\s+na\s+(?:gawa|proyekto|project|trabaho|larawan)\b/i.test(text)) return true;
    if (/\b(?:mga\s+natapos|mga\s+nagawa|mga\s+gawa\s+ni\s+marc)\b/i.test(text)) return true;
    if (/\b(?:portfolio\s+of\s+finished|completed\s+portfolio|portfolio\s+ng\s+natapos)\b/i.test(text)) return true;
    if (/\b(?:actual\s+finished|finished\s+works?|completed\s+works?)\b/i.test(text)) return true;
    if (/\b(?:1\s*to\s*7|1-7)\b/i.test(text) && /\b(?:photos?|pictures?|images?|works?|projects?|jpg)\b/i.test(text)) return true;
    return false;
}

function isDesignInspirationsRequest(message) {
    const text = String(message || '').toLowerCase();
    if (/\b(?:bronze|silver|gold)\s+(?:kitchen|living\s*room|office|bed\s*room|bedroom)\b/i.test(text)) return true;
    if (/\b(?:design\s+ideas?|design\s+inspirations?|inspiration\s+designs?|design\s+concepts?|design\s+options?|catalog\s+designs?|design\s+catalog)\b/i.test(text)) return true;
    if (/\b(?:actual\s+designs?|sample\s+designs?|available\s+designs?|show\s+designs?|browse\s+designs?|view\s+designs?)\b/i.test(text)) return true;
    if (/\b(?:disenyo|mga\s+disenyo|design\s+para\s+sa|sample\s+na\s+disenyo)\b/i.test(text)) return true;
    if (/\b(?:kitchen|living\s*room|office|bedroom|bed\s*room)\s+(?:designs?|ideas?|inspirations?|concepts?)\b/i.test(text)) return true;
    if (/\b(?:show|see|view|send|patingin|pakita|ipakita)\b.{0,30}\b(?:designs?|disenyo|design\s+ideas?)\b/i.test(text)) return true;
    return false;
}

function isUnavailableFinishedCategory(message) {
    const text = String(message || '').toLowerCase();
    const isFinished = isFinishedWorksRequest(message) || /\b(?:finished|completed|past|previous|natapos)\b/i.test(text);
    return isFinished && /\b(?:kiosk|mural|decals?|commercial\s+retail|retail\s+store)\b/i.test(text);
}

function isPortfolioRequest(message) {
    return isFinishedWorksRequest(message) ||
        isDesignInspirationsRequest(message) ||
        /\bportfolio\b|\b(?:show|see|view|send|sample|previous|past|completed)\b.{0,45}\b(?:projects?|designs?|work|photos?|pictures?)\b|\b(?:patingin|pakita|ipakita|tingnan|sample)\b.{0,45}\b(?:gawa|disenyo|projects?|pictures?|larawan)\b/i.test(message);
}

function extractRoomFilter(message) {
    const text = String(message || '').toLowerCase();
    if (/\bkitchen\b/i.test(text)) return 'Kitchen';
    if (/\b(?:living\s*room|lounge|sala)\b/i.test(text)) return 'Living Room';
    if (/\b(?:office|workspace)\b/i.test(text)) return 'Office';
    if (/\b(?:bed\s*room|bedroom|kwarto)\b/i.test(text)) return 'Bed Room';
    return null;
}

async function resolveShowcaseResponse(message, query) {
    if (isUnavailableFinishedCategory(message)) {
        return {
            text: "We do not have photos of completed projects for that specific category in our gallery at this time. Our current gallery features our recent residential interior builds (Projects 1 to 7). Feel free to explore our catalog design inspirations, or leave a message here for the administrator to discuss your custom project.",
            items: [],
            showcaseType: "finished_works"
        };
    }

    if (isFinishedWorksRequest(message)) {
        let items = ACTUAL_FINISHED_WORKS;
        if (query) {
            try {
                const dbItems = (await query("SELECT id, title, image, category FROM portfolio WHERE image IS NOT NULL AND image <> '' ORDER BY id DESC LIMIT 20"))
                    .filter(item => safeImage(item.image));
                if (dbItems.length) items = dbItems.concat(ACTUAL_FINISHED_WORKS).slice(0, 7);
            } catch { /* use ACTUAL_FINISHED_WORKS */ }
        }
        return {
            text: "Here are MARC's actual completed projects (Admin-uploaded finished works). Select any photo to view it in full detail.",
            items: items.slice(0, 7),
            showcaseType: "finished_works"
        };
    }

    if (isDesignInspirationsRequest(message)) {
        let catalog = CATALOG_DESIGNS;
        if (query) {
            try {
                const dbCatalog = (await query("SELECT id, title, category, image FROM design_catalog WHERE deleted=FALSE AND published=TRUE ORDER BY created_at, id"))
                    .filter(item => safeImage(item.image));
                if (dbCatalog.length) catalog = dbCatalog;
            } catch { /* use CATALOG_DESIGNS */ }
        }
        const room = extractRoomFilter(message);
        const filtered = room ? catalog.filter(c => c.category === room || (room === 'Bed Room' && c.category === 'Bedroom')) : catalog;
        const selected = filtered.length ? filtered : catalog;
        return {
            text: "Here are our catalog design inspirations (such as Bronze Kitchen, Silver Office, and more). These concepts serve as design inspiration packages that we tailor to your space.",
            items: selected.slice(0, 9),
            showcaseType: "catalog_designs"
        };
    }

    if (isPortfolioRequest(message)) {
        return {
            text: "Here are photos of MARC's actual finished projects (Projects 1 to 7). If you'd like to explore our catalog design inspirations (such as Bronze Kitchen, Silver Office, etc.), feel free to ask for design ideas!",
            items: ACTUAL_FINISHED_WORKS.slice(0, 7),
            showcaseType: "finished_works"
        };
    }

    return null;
}

function encodePortfolio(text, itemsOrIds, showcaseType = "finished_works") {
    if (!Array.isArray(itemsOrIds)) itemsOrIds = [];
    if (itemsOrIds.length > 0 && typeof itemsOrIds[0] === 'object' && itemsOrIds[0] !== null) {
        return JSON.stringify({
            type: "marc_showcase_v2",
            text,
            showcaseType,
            items: itemsOrIds.map((item, idx) => ({
                id: typeof item.id === 'number' ? item.id : idx + 1,
                title: item.title || item.name || 'MARC Design',
                image: item.image,
            }))
        });
    }
    return JSON.stringify({ type: "marc_portfolio_v1", text, ids: itemsOrIds });
}

function decodePortfolio(row) {
    if (row.sender !== "bot") return null;
    try {
        const data = JSON.parse(row.message);
        if (data.type === "marc_showcase_v2" && typeof data.text === "string" && Array.isArray(data.items)) {
            return {
                text: data.text,
                showcaseType: data.showcaseType || "finished_works",
                items: data.items.filter(item => safeImage(item.image)),
            };
        }
        if (data.type === "marc_portfolio_v1" && typeof data.text === "string" && Array.isArray(data.ids) && data.ids.length <= 20 && data.ids.every(id => Number.isSafeInteger(id) && id > 0)) {
            return {
                text: data.text,
                showcaseType: "finished_works",
                ids: data.ids,
            };
        }
        return null;
    } catch { return null; }
}

module.exports = {
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
};
