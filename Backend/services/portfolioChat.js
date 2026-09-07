function isPortfolioRequest(message) {
    return /\bportfolio\b|\b(?:show|see|view|send|sample|previous|past|completed)\b.{0,45}\b(?:projects?|designs?|work|photos?|pictures?)\b|\b(?:patingin|pakita|ipakita|tingnan|sample)\b.{0,45}\b(?:gawa|disenyo|projects?|pictures?|larawan)\b/i.test(message);
}
function safeImage(value) {
    return typeof value === "string" && (/^https?:\/\/[^\s]+$/i.test(value) || /^\/(?!\/)[^\s\\]+$/.test(value));
}
function encodePortfolio(text, ids) {
    return JSON.stringify({ type: "marc_portfolio_v1", text, ids });
}
function decodePortfolio(row) {
    if (row.sender !== "bot") return null;
    try {
        const data = JSON.parse(row.message);
        if (data.type !== "marc_portfolio_v1" || typeof data.text !== "string" || !Array.isArray(data.ids) || data.ids.length > 6 || !data.ids.every(id => Number.isSafeInteger(id) && id > 0)) return null;
        return data;
    } catch { return null; }
}
module.exports = { isPortfolioRequest, safeImage, encodePortfolio, decodePortfolio };
