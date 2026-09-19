const crypto = require('node:crypto');

function verifySignature(body, header, secret, live, now = Date.now()) {
    if (!Buffer.isBuffer(body) || !secret || typeof header !== 'string') return false;
    const parts = Object.fromEntries(header.split(',').map(part => part.trim().split('=')));
    const signature = parts[live ? 'li' : 'te'];
    if (!/^\d+$/.test(parts.t || '') || !/^[a-f0-9]{64}$/i.test(signature || '')) return false;
    if (Math.abs(now / 1000 - Number(parts.t)) > 300) return false;
    const expected = crypto.createHmac('sha256', secret).update(`${parts.t}.`).update(body).digest();
    return crypto.timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}

// Dependencies are passed explicitly so verification and retries can be tested without moving funds.
function createHandler({ query, provider, configuration }) {
    return async (req, res) => {
        const config = configuration();
        if (!config.configured || !process.env.PAYMONGO_WEBHOOK_SECRET) return res.status(503).json({ message: 'Payment notifications are not configured.' });
        const live = config.mode === 'live';
        if (!verifySignature(req.body, req.get('Paymongo-Signature'), process.env.PAYMONGO_WEBHOOK_SECRET, live)) {
            return res.status(401).json({ message: 'Invalid payment notification signature.' });
        }
        let event;
        try {
            const payload = JSON.parse(req.body.toString('utf8'));
            // Support the existing v1 envelope and the documented send.webhook envelope.
            event = payload?.event_type === 'send.webhook' ? payload.data : payload?.data?.attributes;
        }
        catch { return res.status(400).json({ message: 'Invalid notification JSON.' }); }
        if (!event || typeof event.type !== 'string' || typeof event.livemode !== 'boolean') return res.status(400).json({ message: 'Invalid payment event.' });
        if (event.livemode !== live) return res.status(400).json({ message: 'Payment mode mismatch.' });
        if (event.type !== 'checkout_session.payment.paid') return res.json({ received: true });
        const sessionId = event.data?.id;
        if (typeof sessionId !== 'string' || !/^cs_[a-zA-Z0-9_-]+$/.test(sessionId)) return res.status(400).json({ message: 'Invalid checkout session.' });
        try {
            const rows = await query("SELECT id, amount, status, checkout_session_id FROM gcash_requests WHERE checkout_session_id=? AND payment_provider='PayMongo'", [sessionId]);
            if (!rows.length) {
                const reference = event.data?.attributes?.reference_number;
                if (typeof reference === 'string' && !/^GCASH-\d+$/.test(reference)) return res.json({ received: true });
                // A notification can race the checkout creation database update. Retry rather than lose it.
                return res.status(503).json({ message: 'Checkout is not recorded yet. Retry delivery.' });
            }
            const payment = rows[0];
            if (payment.status === 'Paid') return res.json({ received: true });
            const session = await provider.request(`/checkout_sessions/${encodeURIComponent(sessionId)}`);
            const paid = provider.paidPayment(session, payment);
            if (!paid) return res.status(409).json({ message: 'Payment details could not be confirmed.' });
            await query("UPDATE gcash_requests SET status='Paid', provider_payment_id=?, reviewed_at=NOW() WHERE id=? AND checkout_session_id=? AND payment_provider='PayMongo' AND status <> 'Paid'", [paid.id, payment.id, sessionId]);
            return res.json({ received: true });
        } catch {
            return res.status(503).json({ message: 'Unable to record payment. Retry delivery.' });
        }
    };
}

module.exports = { verifySignature, createHandler };
