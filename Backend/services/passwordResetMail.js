function configured() {
    return Boolean(process.env.RESEND_API_KEY && process.env.PASSWORD_RESET_FROM && process.env.FRONTEND_URL);
}

async function send(email, token, minutes) {
    if (!configured()) throw new Error('MAIL_NOT_CONFIGURED');
    const url = new URL('/reset-password', process.env.FRONTEND_URL.split(',')[0].trim());
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('INVALID_FRONTEND_URL');
    url.searchParams.set('token', token);
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            from: process.env.PASSWORD_RESET_FROM,
            to: [email],
            subject: 'Reset your MARC password',
            text: `Open this link to choose a new password: ${url.href}\n\nThis link expires in ${minutes} minutes and can be used once. If you did not request this, ignore this email.`,
        }),
        signal: AbortSignal.timeout(15000),
    });
    if (!response.ok || !(await response.json()).id) throw new Error('MAIL_PROVIDER_UNAVAILABLE');
}

module.exports = { configured, send };
