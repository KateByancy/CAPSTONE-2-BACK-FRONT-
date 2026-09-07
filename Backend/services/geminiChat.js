const { buildSystemInstruction } = require("./chatbotInstructions");

async function generateReply(history, { fetchImpl = fetch } = {}) {
    const key = process.env.GEMINI_API_KEY?.trim();
    if (!key) throw new Error("GEMINI_KEY_MISSING");
    const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
    const contents = history.slice(-12).map((row) => ({
        role: row.sender === "bot" ? "model" : "user",
        parts: [{ text: `${row.sender === "admin" ? "Administrator: " : ""}${String(row.message).slice(0, 2000)}` }],
    }));
    // A truncated conversation may begin with an old model response.
    while (contents[0]?.role === "model") contents.shift();
    const response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: buildSystemInstruction() }] },
            contents,
            generationConfig: { maxOutputTokens: 2048 },
        }),
    });
    // Never expose provider response bodies, request headers or credentials in logs.
    if (!response.ok) throw new Error(`GEMINI_HTTP_${response.status}`);
    const result = await response.json();
    const reply = result.candidates?.[0]?.content?.parts
        ?.filter((part) => !part.thought && typeof part.text === "string")
        .map((part) => part.text).join("").trim();
    if (!reply) throw new Error("GEMINI_EMPTY_RESPONSE");
    return reply;
}

module.exports = { generateReply };
