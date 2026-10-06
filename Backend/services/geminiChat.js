const { buildSystemInstruction } = require("./chatbotInstructions");

async function generateReply(history, { fetchImpl = fetch, wait = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
    const key = process.env.GEMINI_API_KEY?.trim();
    if (!key) throw new Error("GEMINI_KEY_MISSING");
    const model = process.env.GEMINI_MODEL?.trim().replace(/^models\//, '') || "gemini-3.5-flash-lite";
    const contents = history.slice(-12).map((row) => ({
        role: row.sender === "bot" ? "model" : "user",
        parts: [{ text: `${row.sender === "admin" ? "Administrator: " : ""}${String(row.message).slice(0, 2000)}` }],
    }));
    // A truncated conversation may begin with an old model response.
    while (contents[0]?.role === "model") contents.shift();
    const request = {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: buildSystemInstruction() }] },
            contents,
            generationConfig: {
                maxOutputTokens: 2048,
                // Keep short concierge replies from exhausting their budget on reasoning.
                ...(model.startsWith('gemini-3') ? { thinkingConfig: { thinkingLevel: 'low' } } : {}),
            },
        }),
    };
    let response;
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
                ...request, signal: AbortSignal.timeout(25000),
            });
        } catch (error) {
            if (attempt === 1 || !['TypeError', 'TimeoutError', 'AbortError'].includes(error.name)) throw error;
            await wait(1000 + Math.floor(Math.random() * 250));
            continue;
        }
        if (response.ok) break;
        // Never expose provider response bodies, request headers or credentials in logs.
        if (attempt === 1 || ![408, 429, 500, 502, 503, 504].includes(response.status)) throw new Error(`GEMINI_HTTP_${response.status}`);
        if (response.body?.cancel) await response.body.cancel();
        await wait(1000 + Math.floor(Math.random() * 250));
    }
    const result = await response.json();
    const reply = result.candidates?.[0]?.content?.parts
        ?.filter((part) => !part.thought && typeof part.text === "string")
        .map((part) => part.text).join("").trim();
    if (!reply) throw new Error("GEMINI_EMPTY_RESPONSE");
    return reply;
}

module.exports = { generateReply };
