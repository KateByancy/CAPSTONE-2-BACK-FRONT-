const db = require('../config/db');
const paymongo = require('../services/paymongoCheckout');
const latestPaymentFirst = require('../utils/paymentOrder');
const query = (sql, values = []) => new Promise((resolve, reject) => db.query(sql, values, (error, rows) => error ? reject(error) : resolve(rows)));
const wrap = handler => async (req, res) => {
    try { await handler(req, res); }
    catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'This reference is already used, or this booking already has an open payment request. Refresh and check your entries.' });
        console.error('GCash payment error:', error.code || 'UNKNOWN', error.message);
        if (['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR'].includes(error.code)) return res.status(503).json({ message: 'Payment database setup is incomplete. Redeploy the updated backend to initialize GCash storage.' });
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
    const rows = await query('SELECT account_name, account_number, qr_image FROM gcash_settings WHERE id=1');
    res.json({ settings: rows[0] || null, provider: 'Manual', configured: Boolean(rows[0]?.qr_image) });
});
exports.saveSettings = wrap(async (req, res) => {
    const name = typeof req.body.account_name === 'string' ? req.body.account_name.trim() : '';
    const number = typeof req.body.account_number === 'string' ? req.body.account_number.trim() : '';
    if (!name || name.length > 100 || !/^09\d{9}$/.test(number)) return res.status(400).json({ message: 'Enter the GCash account name and an 11-digit mobile number starting with 09.' });
    const qr = req.body.qr_image || null;
    if (qr && (typeof qr !== 'string' || !/^\/api\/portfolio\/images\/[a-zA-Z0-9_.-]+$/.test(qr))) return res.status(400).json({ message: 'Upload a GCash QR image first.' });
    await query('INSERT INTO gcash_settings (id, account_name, account_number, qr_image) VALUES (1,?,?,?) ON DUPLICATE KEY UPDATE account_name=VALUES(account_name), account_number=VALUES(account_number), qr_image=VALUES(qr_image)', [name, number, qr]);
    res.json({ success: true });
});
exports.list = wrap(async (req, res) => {
    const admin = req.user.role === 'admin';
    const payments = await query(`SELECT p.id, p.booking_id, p.amount, p.description, p.account_name, p.account_number, p.status,
        p.reference_number, p.review_note, p.created_at, p.submitted_at, p.reviewed_at,
        p.payment_provider, p.checkout_session_id, p.checkout_creating, p.qr_image,
        p.proof IS NOT NULL AS has_proof, b.service_type, b.status AS booking_status, u.fullname AS client_name
        FROM gcash_requests p JOIN bookings b ON b.id=p.booking_id JOIN users u ON u.id=b.user_id
        ${admin ? '' : 'WHERE b.user_id=?'} ORDER BY p.id DESC`, admin ? [] : [req.user.id]);
    let syncWarning = '';
    for (const payment of payments) {
        if (payment.payment_provider !== 'PayMongo' || payment.status === 'Paid' || !payment.checkout_session_id) continue;
        try { await syncPayment(payment); }
        catch { syncWarning = 'Some payment statuses could not be checked with PayMongo. Refresh to try again; do not pay again while confirmation is pending.'; }
    }
    payments.sort(latestPaymentFirst);
    const bookings = admin ? await query(`SELECT b.id, b.service_type, u.fullname AS client_name FROM bookings b JOIN users u ON u.id=b.user_id
        WHERE ${accepted} AND NOT EXISTS (SELECT 1 FROM gcash_requests p WHERE p.booking_id=b.id AND p.status IN ('Awaiting payment','For verification','Returned')) ORDER BY b.id DESC`) : [];
    const legacy = await query(`SELECT p.id, p.booking_id, p.amount, p.reference_number, p.payment_status AS status, p.created_at,
        b.service_type, u.fullname AS client_name FROM payments p JOIN bookings b ON b.id=p.booking_id
        JOIN users u ON u.id=b.user_id ${admin ? '' : 'WHERE b.user_id=?'} ORDER BY p.id DESC`, admin ? [] : [req.user.id]);
    const estimates = await query(`SELECT b.id, b.service_type, b.status, b.estimate, u.fullname AS client_name
        FROM bookings b JOIN users u ON u.id=b.user_id WHERE b.estimate IS NOT NULL
        ${admin ? '' : 'AND b.user_id=?'} ORDER BY b.id DESC`, admin ? [] : [req.user.id]);
    for (const row of estimates) {
        if (typeof row.estimate === 'string') { try { row.estimate = JSON.parse(row.estimate); } catch { row.estimate = null; } }
    }
    res.json({ payments, bookings, legacy, estimates, syncWarning });
});
exports.create = wrap(async (req, res) => {
    const { booking_id, amount, description } = req.body;
    if (!Number.isSafeInteger(Number(booking_id)) || Number(booking_id) < 1 || !/^[0-9]+(?:\.[0-9]{1,2})?$/.test(String(amount)) || Number(amount) < 100 || Number(amount) > 99999999.99 || typeof description !== 'string' || !description.trim() || description.trim().length > 200) {
        return res.status(400).json({ message: 'Select an accepted booking, enter at least PHP 100 with up to two decimal places, and a description (up to 200 characters).' });
    }
    if (req.body.payment_provider && req.body.payment_provider !== 'Manual') return res.status(400).json({ message: 'Payments use the admin GCash QR only.' });
    const settings = (await query('SELECT account_name, account_number, qr_image FROM gcash_settings WHERE id=1'))[0];
    if (!settings?.qr_image) return res.status(409).json({ message: 'Save the admin GCash account and QR image first.' });
    const result = await query(`INSERT INTO gcash_requests (booking_id, amount, description, account_name, account_number, payment_provider, qr_image)
        SELECT b.id, ?, ?, ?, ?, ?, ? FROM bookings b
        WHERE b.id=? AND ${accepted}`, [amount, description.trim(), settings.account_name, settings.account_number, 'Manual', settings.qr_image, booking_id]);
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
        await query("UPDATE gcash_requests SET status='Paid', provider_payment_id=?, reviewed_at=NOW() WHERE id=? AND checkout_session_id=? AND payment_provider='PayMongo' AND status <> 'Paid'", [paid.id, payment.id, payment.checkout_session_id]);
        payment.status = 'Paid';
        payment.reviewed_at = new Date().toISOString();
    }
    return session;
}
exports.checkout = (_req, res) => res.status(410).json({ message: 'PayMongo checkout is disabled. Contact the admin for a GCash QR payment request.' });
