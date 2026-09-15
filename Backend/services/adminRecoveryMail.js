function configuration() {
    const user = (process.env.ADMIN_RECOVERY_GMAIL_USER || '').trim();
    const password = (process.env.ADMIN_RECOVERY_GMAIL_APP_PASSWORD || '').replace(/\s/g, '');
    const origin = (process.env.FRONTEND_URL || '').split(',')[0].trim();
    let error = '';
    if (!/^[^\s@]+@gmail\.com$/i.test(user)) error = 'Set ADMIN_RECOVERY_GMAIL_USER to the Gmail sender address.';
    else if (!/^[a-zA-Z0-9]{16}$/.test(password)) error = 'Set ADMIN_RECOVERY_GMAIL_APP_PASSWORD to a Google App Password (not your Google login password).';
    try {
        const url = new URL(origin);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error();
        if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') throw new Error();
    } catch { error = 'Set FRONTEND_URL to the frontend origin (HTTPS in production).'; }
    return { configured: !error, error, user, password, origin };
}

function transport() {
    const config = configuration();
    if (!config.configured) throw new Error(config.error);
    return require('nodemailer').createTransport({
        host: 'smtp.gmail.com', port: 465, secure: true,
        auth: { user: config.user, pass: config.password },
        connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 20000,
        disableFileAccess: true, disableUrlAccess: true,
    });
}

async function send(email, token) {
    const config = configuration();
    if (!config.configured) throw new Error(config.error);
    const url = new URL('/admin/forgot-password', config.origin);
    url.searchParams.set('token', token);
    const result = await transport().sendMail({
        from: { name: 'MARC Account Recovery', address: config.user }, to: email,
        subject: 'Reset your MARC admin password',
        text: `Open this link to set a new MARC admin password:\n${url.href}\n\nThe link expires in 15 minutes and can be used once. If you did not request this, ignore this email.`,
    });
    if (!result.accepted?.length) throw new Error('Email was not accepted by the provider.');
}

async function sendClientCode(email, code) {
    const config = configuration();
    if (!config.configured) throw new Error(config.error);
    const result = await transport().sendMail({
        from: { name: 'MARC Account Recovery', address: config.user }, to: email,
        subject: 'Your MARC password reset code',
        text: `Your MARC password reset code is: ${code}\n\nEnter this code on the Forgot Password page to choose a new password. It expires in 10 minutes and can be used once. If you did not request this, ignore this email.`,
    });
    if (!result.accepted?.length) throw new Error('Email was not accepted by the provider.');
}

module.exports = { configuration, send, sendClientCode, verify: () => transport().verify() };
