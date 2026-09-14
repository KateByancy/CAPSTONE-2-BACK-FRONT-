function normalizePhone(value) {
    const phone = String(value || '').replace(/[\s()-]/g, '');
    if (/^09\d{9}$/.test(phone)) return '+63' + phone.slice(1);
    if (/^639\d{9}$/.test(phone)) return '+' + phone;
    return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}

function configured() {
    return /^AC[0-9a-f]{32}$/i.test(process.env.TWILIO_ACCOUNT_SID || '') &&
        /^VA[0-9a-f]{32}$/i.test(process.env.TWILIO_VERIFY_SERVICE_SID || '') &&
        Boolean(process.env.TWILIO_AUTH_TOKEN);
}

async function request(resource, parameters) {
    if (!configured()) throw new Error('SMS_NOT_CONFIGURED');
    const response = await fetch(`https://verify.twilio.com/v2/Services/${process.env.TWILIO_VERIFY_SERVICE_SID}/${resource}`, {
        method: 'POST',
        headers: {
            Authorization: 'Basic ' + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(parameters),
        signal: AbortSignal.timeout(15000),
    });
    if (resource === 'VerificationCheck' && [400, 404, 429].includes(response.status)) return { status: 'invalid' };
    if (!response.ok) throw new Error('SMS_PROVIDER_UNAVAILABLE');
    return response.json();
}

async function send(phone) {
    const result = await request('Verifications', { To: phone, Channel: 'sms' });
    if (result.status !== 'pending' || !/^VE[0-9a-f]{32}$/i.test(result.sid || '')) throw new Error('SMS_PROVIDER_UNAVAILABLE');
    return result.sid;
}

async function check(sid, code) {
    const result = await request('VerificationCheck', { VerificationSid: sid, Code: code });
    return result.status === 'approved';
}

module.exports = { normalizePhone, configured, send, check };
