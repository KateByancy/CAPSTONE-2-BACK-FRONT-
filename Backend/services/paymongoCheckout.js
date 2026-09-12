const request = async (path, options = {}) => {
    const key = process.env.PAYMONGO_SECRET_KEY;
    if (!key) throw Object.assign(new Error('PayMongo is not configured on the backend.'), { statusCode: 503 });
    const response = await fetch(`https://api.paymongo.com/v1${path}`, {
        ...options, signal: AbortSignal.timeout(15000),
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}` },
    });
    const result = await response.json();
    if (!response.ok) throw Object.assign(new Error(result.errors?.[0]?.detail || 'PayMongo request failed.'), { statusCode: 502, providerStatus: response.status });
    return result.data;
};
const paidPayment = (session, payment) => {
    if (session.id !== payment.checkout_session_id || session.attributes?.livemode !== process.env.PAYMONGO_SECRET_KEY?.startsWith('sk_live_')) return null;
    return session.attributes?.payments?.find(item => item.attributes?.status === 'paid'
        && item.attributes.currency === 'PHP' && item.attributes.amount === Math.round(Number(payment.amount) * 100)
        && item.attributes.source?.type === 'gcash') || null;
};
module.exports = { request, paidPayment };
