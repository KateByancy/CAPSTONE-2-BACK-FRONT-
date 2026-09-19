require('dotenv').config({ quiet: true });
const { assertConfigured, checkRegisteredWebhook } = require('./services/paymentConfig');
const provider = require('./services/paymongoCheckout');

(async () => {
    try {
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
