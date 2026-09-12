const db = require('../config/db');
const paymongo = require('../services/paymongoCheckout');
const query = (sql, values = []) => new Promise((resolve, reject) => db.query(sql, values, (error, rows) => error ? reject(error) : resolve(rows)));
const wrap = handler => async (req, res) => {
    try { await handler(req, res); }
    catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'This reference is already used, or this booking already has an open payment request. Refresh and check your entries.' });
        console.error('GCash payment error:', error.message);
        res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Unable to save or load payments. Please try again.' });
    }
};
const accepted = "(b.accepted_at IS NOT NULL OR LOWER(b.status) IN ('confirmed','approved')) AND LOWER(b.status) NOT IN ('rejected','cancelled')";
const imageType = buffer => {
    if (!buffer) return null;
    if (buffer.length >= 8 && buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
    if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return 'image/jpeg';
    if (buffer.length >= 12 && buffer.toString('ascii',0,4) === 'RIFF' && buffer.toString('ascii',8,12) === 'WEBP') return 'image/webp';
    return null;
};
exports.getSettings = wrap(async (_req, res) => {
    const rows = await query('SELECT account_name, account_number FROM gcash_settings WHERE id=1');
    res.json({ settings: rows[0] || null, provider: 'PayMongo', configured: Boolean(process.env.PAYMONGO_SECRET_KEY), testMode: process.env.PAYMONGO_SECRET_KEY?.startsWith('sk_test_') || false });
});
exports.saveSettings = wrap(async (req, res) => {
    const name = typeof req.body.account_name === 'string' ? req.body.account_name.trim() : '';
    const number = typeof req.body.account_number === 'string' ? req.body.account_number.trim() : '';
    if (!name || name.length > 100 || !/^09\d{9}$/.test(number)) return res.status(400).json({ message: 'Enter the GCash account name and an 11-digit mobile number starting with 09.' });
    await query('INSERT INTO gcash_settings (id, account_name, account_number) VALUES (1,?,?) ON DUPLICATE KEY UPDATE account_name=VALUES(account_name), account_number=VALUES(account_number)', [name, number]);
    res.json({ success: true });
});
exports.list = wrap(async (req, res) => {
    const admin = req.user.role === 'admin';
    const payments = await query(`SELECT p.id, p.booking_id, p.amount, p.description, p.account_name, p.account_number, p.status,
        p.reference_number, p.review_note, p.created_at, p.submitted_at, p.reviewed_at,
        p.payment_provider, p.checkout_session_id, p.checkout_creating,
        p.proof IS NOT NULL AS has_proof, b.service_type, b.status AS booking_status, u.fullname AS client_name
        FROM gcash_requests p JOIN bookings b ON b.id=p.booking_id JOIN users u ON u.id=b.user_id
        ${admin ? '' : 'WHERE b.user_id=?'} ORDER BY p.id DESC`, admin ? [] : [req.user.id]);
    let syncWarning = '';
    for (const payment of payments) {
        if (payment.payment_provider !== 'PayMongo' || payment.status === 'Paid' || !payment.checkout_session_id) continue;
        try { await syncPayment(payment); }
        catch { syncWarning = 'Some payment statuses could not be checked with PayMongo. Refresh to try again; do not pay again while confirmation is pending.'; }
    }
    const bookings = admin ? await query(`SELECT b.id, b.service_type, u.fullname AS client_name FROM bookings b JOIN users u ON u.id=b.user_id
        WHERE ${accepted} AND NOT EXISTS (SELECT 1 FROM gcash_requests p WHERE p.booking_id=b.id AND p.status IN ('Awaiting payment','For verification','Returned')) ORDER BY b.id DESC`) : [];
    const legacy = await query(`SELECT p.id, p.booking_id, p.amount, p.reference_number, p.payment_status AS status, p.created_at,
        b.service_type, u.fullname AS client_name FROM payments p JOIN bookings b ON b.id=p.booking_id
        JOIN users u ON u.id=b.user_id ${admin ? '' : 'WHERE b.user_id=?'} ORDER BY p.id DESC`, admin ? [] : [req.user.id]);
    res.json({ payments, bookings, legacy, syncWarning });
});
exports.create = wrap(async (req, res) => {
    const { booking_id, amount, description } = req.body;
    if (!Number.isSafeInteger(Number(booking_id)) || Number(booking_id) < 1 || !/^[0-9]+(?:\.[0-9]{1,2})?$/.test(String(amount)) || Number(amount) < 100 || Number(amount) > 99999999.99 || typeof description !== 'string' || !description.trim() || description.trim().length > 200) {
        return res.status(400).json({ message: 'Select an accepted booking, enter at least PHP 100 with up to two decimal places, and a description (up to 200 characters).' });
    }
    if (!process.env.PAYMONGO_SECRET_KEY) return res.status(503).json({ message: 'Configure PAYMONGO_SECRET_KEY on the backend first.' });
    const result = await query(`INSERT INTO gcash_requests (booking_id, amount, description, account_name, account_number, payment_provider)
        SELECT b.id, ?, ?, '', '', 'PayMongo' FROM bookings b
        WHERE b.id=? AND ${accepted}`, [amount, description.trim(), booking_id]);
    if (!result.affectedRows) return res.status(409).json({ message: 'Select an accepted booking first.' });
    res.status(201).json({ success: true });
});
exports.submit = wrap(async (req, res) => {
    const reference = typeof req.body.reference_number === 'string' ? req.body.reference_number.trim() : '';
    const type = imageType(req.file?.buffer);
    if (!/^\d{10,30}$/.test(reference) || !type) return res.status(400).json({ message: 'Enter the numeric GCash reference (10–30 digits) and upload a PNG, JPEG or WebP receipt, up to 5 MB.' });
    const result = await query(`UPDATE gcash_requests p JOIN bookings b ON b.id=p.booking_id
        SET p.reference_number=?, p.proof=?, p.proof_type=?, p.status='For verification', p.submitted_at=NOW(), p.reviewed_by=NULL, p.reviewed_at=NULL
        WHERE p.id=? AND b.user_id=? AND p.payment_provider='Manual' AND p.status IN ('Awaiting payment','Returned') AND ${accepted}`,
        [reference, req.file.buffer, type, req.params.id, req.user.id]);
    if (!result.affectedRows) return res.status(409).json({ message: 'This request cannot accept a receipt. Refresh to check its status and booking.' });
    res.json({ success: true });
});
exports.proof = wrap(async (req, res) => {
    const rows = await query(`SELECT p.proof, p.proof_type FROM gcash_requests p JOIN bookings b ON b.id=p.booking_id
        WHERE p.id=? ${req.user.role === 'admin' ? '' : 'AND b.user_id=?'}`, req.user.role === 'admin' ? [req.params.id] : [req.params.id, req.user.id]);
    if (!rows[0]?.proof) return res.status(404).json({ message: 'Receipt not found.' });
    res.set({ 'Content-Type': rows[0].proof_type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }).send(rows[0].proof);
});
exports.review = wrap(async (req, res) => {
    const { decision, note, confirmed } = req.body;
    if (!['Paid','Returned'].includes(decision) || (decision === 'Paid' && confirmed !== true) || (decision === 'Returned' && (typeof note !== 'string' || !note.trim() || note.trim().length > 500))) return res.status(400).json({ message: 'Confirm receipt of funds before marking paid, or give a return reason (up to 500 characters).' });
    const result = await query(`UPDATE gcash_requests SET status=?, review_note=?, reviewed_by=?, reviewed_at=NOW()
        WHERE id=? AND payment_provider='Manual' AND status='For verification' AND proof IS NOT NULL`, [decision, decision === 'Returned' ? note.trim() : null, req.user.id, req.params.id]);
    if (!result.affectedRows) return res.status(409).json({ message: 'Only payments awaiting verification can be reviewed. Refresh and try again.' });
    res.json({ success: true });
});
exports.cancel = wrap(async (req, res) => {
    const note = typeof req.body.note === 'string' ? req.body.note.trim() : '';
    if (!note || note.length > 500) return res.status(400).json({ message: 'Give a cancellation reason (up to 500 characters).' });
    const result = await query(`UPDATE gcash_requests SET status='Cancelled', review_note=?, reviewed_by=?, reviewed_at=NOW()
        WHERE id=? AND status='Awaiting payment' AND proof IS NULL AND checkout_session_id IS NULL AND checkout_creating=FALSE`, [note, req.user.id, req.params.id]);
    if (!result.affectedRows) return res.status(409).json({ message: 'Only requests without a submitted receipt can be cancelled. Refresh and check the payment.' });
    res.json({ success: true });
});

async function syncPayment(payment) {
    const session = await paymongo.request(`/checkout_sessions/${encodeURIComponent(payment.checkout_session_id)}`);
    const paid = paymongo.paidPayment(session, payment);
    if (paid) {
        await query("UPDATE gcash_requests SET status='Paid', provider_payment_id=?, reviewed_at=NOW() WHERE id=? AND checkout_session_id=? AND payment_provider='PayMongo'", [paid.id, payment.id, payment.checkout_session_id]);
        payment.status = 'Paid';
    }
    return session;
}
exports.checkout = wrap(async (req, res) => {
    const rows = await query(`SELECT p.*, b.service_type FROM gcash_requests p JOIN bookings b ON b.id=p.booking_id
        WHERE p.id=? AND b.user_id=? AND p.payment_provider='PayMongo' AND ${accepted}`, [req.params.id, req.user.id]);
    const payment = rows[0];
    if (!payment) return res.status(404).json({ message: 'Payment request not found for this account.' });
    if (payment.checkout_session_id) {
        const session = await syncPayment(payment);
        if (payment.status === 'Paid') return res.json({ paid: true });
        if (session.attributes.status === 'expired') return res.status(409).json({ message: 'This checkout expired. Contact the admin to reconcile it before creating another payment.' });
        return res.json({ checkoutUrl: payment.checkout_url });
    }
    if (payment.status !== 'Awaiting payment') return res.status(409).json({ message: 'This payment cannot start checkout.' });
    const lock = await query("UPDATE gcash_requests SET checkout_creating=TRUE WHERE id=? AND status='Awaiting payment' AND checkout_creating=FALSE AND checkout_session_id IS NULL", [payment.id]);
    if (!lock.affectedRows) return res.status(409).json({ message: 'Checkout is being prepared or needs reconciliation. Refresh shortly; contact the admin if this persists.' });
    try {
        const frontend = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim().replace(/\/$/, '');
        const session = await paymongo.request('/checkout_sessions', { method: 'POST', body: JSON.stringify({ data: { attributes: {
            line_items: [{ amount: Math.round(Number(payment.amount) * 100), currency: 'PHP', name: payment.description, quantity: 1 }],
            payment_method_types: ['gcash'], reference_number: `GCASH-${payment.id}`,
            description: `Booking #${payment.booking_id}: ${payment.service_type}`,
            success_url: `${frontend}/?payment=success`, cancel_url: `${frontend}/?payment=cancelled`,
            show_description: true, show_line_items: true,
        } } }) });
        const url = new URL(session.attributes.checkout_url);
        if (url.protocol !== 'https:' || url.hostname !== 'checkout.paymongo.com') throw new Error('Unexpected checkout URL.');
        await query('UPDATE gcash_requests SET checkout_session_id=?, checkout_url=?, checkout_creating=FALSE WHERE id=?', [session.id, url.href, payment.id]);
        return res.json({ checkoutUrl: url.href });
    } catch (error) {
        // An ambiguous timeout may have created a session. Keep the lock to avoid charging twice.
        if (error.providerStatus >= 400 && error.providerStatus < 500 || error.statusCode === 503) await query('UPDATE gcash_requests SET checkout_creating=FALSE WHERE id=?', [payment.id]);
        throw error;
    }
});
