require('dotenv').config({ path: require('node:path').join(__dirname, '.env'), quiet: true });
const mail = require('./services/adminRecoveryMail');
(async () => {
    const config = mail.configuration();
    if (!config.configured) { console.error(config.error); process.exitCode = 1; return; }
    console.log('Admin Gmail recovery settings have the expected format.');
    if (process.argv.includes('--verify')) {
        try { await mail.verify(); console.log('Gmail accepted the SMTP connection and credentials. No email was sent.'); }
        catch (error) { console.error('Gmail connection failed:', error.code || 'SMTP_ERROR'); process.exitCode = 1; }
    } else console.log('Use --verify to check Gmail authentication without sending an email.');
})();
