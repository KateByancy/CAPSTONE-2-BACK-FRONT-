require('dotenv').config({ path: require('node:path').join(__dirname, '.env'), quiet: true });
const sms = require('./services/adminSmsVerify');
const checks = [
    ['TWILIO_ACCOUNT_SID', value => /^AC[0-9a-f]{32}$/i.test(value)],
    ['TWILIO_AUTH_TOKEN', value => Boolean(value.trim())],
    ['TWILIO_VERIFY_SERVICE_SID', value => /^VA[0-9a-f]{32}$/i.test(value)],
];
for (const [name, valid] of checks) {
    const value = process.env[name] || '';
    console.log(`${name}: ${!value ? 'missing' : valid(value) ? 'format OK' : 'invalid format'}`);
}
if (!sms.configured()) {
    console.error('SMS recovery is not ready. Fill the missing/invalid entries in Backend/.env and restart the backend.');
    process.exitCode = 1;
} else {
    console.log('Local SMS configuration passed. This does not verify provider credentials, permissions, balance or actual delivery.');
}
