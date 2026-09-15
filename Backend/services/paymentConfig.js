function configuration() {
    const key = process.env.PAYMONGO_SECRET_KEY || '';
    const mode = process.env.PAYMENTS_MODE || (process.env.NODE_ENV === 'production' ? 'live' : 'test');
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim().replace(/\/$/, '');
    let error = '';
    if (!['live', 'test'].includes(mode)) error = 'PAYMENTS_MODE must be live or test.';
    else if (process.env.NODE_ENV === 'production' && mode !== 'live') error = 'Production payments require live mode.';
    else if (!key.startsWith(`sk_${mode}_`) || key.length <= `sk_${mode}_`.length) error = `Configure a PayMongo ${mode} secret key on the backend.`;
    else if (mode === 'live' && !process.env.PAYMONGO_WEBHOOK_SECRET) error = 'Configure the live PayMongo webhook signing secret on the backend.';
    try {
        const url = new URL(frontendUrl);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error();
        if (mode === 'live' && (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new Error();
    } catch { error = 'FRONTEND_URL must be a website origin; live payments require a public HTTPS origin.'; }
    return { configured: !error, mode, frontendUrl, error };
}

function assertConfigured() {
    const config = configuration();
    if (!config.configured) throw Object.assign(new Error(config.error), { statusCode: 503 });
    return config;
}

module.exports = { configuration, assertConfigured };
