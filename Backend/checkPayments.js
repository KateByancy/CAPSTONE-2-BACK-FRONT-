require('dotenv').config({ path:require('node:path').join(__dirname,'.env'), quiet: true });
const { assertConfigured, checkRegisteredWebhook } = require('./services/paymentConfig');
const provider = require('./services/paymongoCheckout');

(async () => {
    try {
        if (!process.argv.some(flag=>['--provider','--webhook','--live','--paymongo'].includes(flag))) {
            const db=require('./config/db');
            const query=sql=>new Promise((resolve,reject)=>db.query(sql,(error,rows)=>error?reject(error):resolve(rows)));
            try {
                const [settings]=await query('SELECT account_name,account_number,qr_image FROM gcash_settings WHERE id=1');
                const columns=await query('SHOW COLUMNS FROM gcash_requests');
                await query('SELECT id FROM payment_audit LIMIT 1');
                if(!columns.some(column=>column.Field==='proof_hash'))throw Error('Restart the updated backend to initialize receipt protection.');
                if(!settings?.account_name || !/^09\d{9}$/.test(settings.account_number)||!settings.qr_image)throw Error('Configure the admin GCash account and QR image in Payments.');
                console.log('Manual GCash storage, receipt protection, audit history, and account settings are ready.');
                console.log('No funds were moved. An admin must confirm each transfer in the GCash account before marking it Paid.');
                return;
            } finally { db.destroy(); }
        }
        const config = assertConfigured();
        if (process.argv.includes('--live') && config.mode !== 'live') throw new Error('Live readiness requires PAYMENTS_MODE=live and live credentials. The current configuration is still test mode.');
        console.log(`Payment configuration passed (${config.mode} mode). Return origin: ${config.frontendUrl}`);
        console.log('This checks configuration only; it does not prove account activation or webhook delivery.');
        if (process.argv.includes('--provider')) {
            const result = await provider.request('/merchants/capabilities/payment_methods');
            // Capability response shapes can vary. Never assume that merely having a key enables GCash.
            console.log('PayMongo accepted the key. Confirm GCash is enabled in Dashboard > Settings > Payment Methods.');
            console.log('Capability response received:', result ? 'yes' : 'no');
        }
        if (process.argv.includes('--webhook')) {
            if (!process.env.PAYMONGO_WEBHOOK_URL) throw new Error('Set PAYMONGO_WEBHOOK_URL to your public /api/payment/webhook endpoint.');
            const hooks = await provider.request('/webhooks');
            const count = checkRegisteredWebhook(hooks, config, process.env.PAYMONGO_WEBHOOK_URL, process.env.PAYMONGO_WEBHOOK_SECRET);
            console.log(`Registered webhook verified (${count} matching endpoint(s)): URL, mode, enabled status, paid event and signing secret match.`);
            console.log('This read-only check does not prove delivery. Confirm an actual signed event receives HTTP 200 after deployment.');
        }
    } catch (error) {
        console.error('Payment readiness check failed:', error.message);
        process.exitCode = 1;
    }
})();
