function configuration() {
    const key = process.env.PAYMONGO_SECRET_KEY || '';
    const mode = process.env.PAYMENTS_MODE || (process.env.NODE_ENV === 'production' ? 'live' : 'test');
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim().replace(/\/$/, '');
    let error = '';
    if (!['live', 'test'].includes(mode)) error = 'PAYMENTS_MODE must be live or test.';
    else if (process.env.NODE_ENV === 'production' && mode !== 'live') error = 'Production payments require live mode.';
    else if (!key.startsWith(`sk_${mode}_`) || key.length <= `sk_${mode}_`.length) error = `Configure a PayMongo ${mode} secret key on the backend.`;
    else if (mode === 'live' && !process.env.PAYMONGO_WEBHOOK_SECRET?.trim()) error = 'Configure the live PayMongo webhook signing secret on the backend.';
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

function checkRegisteredWebhook(webhooks, config, expectedUrl, secret) {
    let url;
    try { url = new URL(expectedUrl); } catch { throw new Error('Set PAYMONGO_WEBHOOK_URL to the public HTTPS /api/payment/webhook endpoint.'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/api/payment/webhook'
        || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
        throw new Error('PAYMONGO_WEBHOOK_URL must be a public HTTPS URL ending in /api/payment/webhook.');
    }
    if (!Array.isArray(webhooks)) throw new Error('Unexpected PayMongo webhook response. Check the endpoint in the PayMongo dashboard.');
    const matches = webhooks.filter(hook => hook.attributes?.url === url.href
        && hook.attributes.livemode === (config.mode === 'live')
        && hook.attributes.status === 'enabled'
        && hook.attributes.events?.includes('checkout_session.payment.paid'));
    if (!matches.length) throw new Error('No enabled webhook matches this URL, payment mode and checkout_session.payment.paid event.');
    if (!secret || !matches.some(hook => hook.attributes.secret_key === secret)) {
        throw new Error('PAYMONGO_WEBHOOK_SECRET does not match the registered endpoint signing secret.');
    }
    return matches.length;
}

module.exports = { configuration, assertConfigured, checkRegisteredWebhook };
