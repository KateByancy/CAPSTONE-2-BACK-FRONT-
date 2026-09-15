require('dotenv').config({ quiet: true });
const { assertConfigured } = require('./services/paymentConfig');
const provider = require('./services/paymongoCheckout');

(async () => {
    try {
        const config = assertConfigured();
        console.log(`Payment configuration passed (${config.mode} mode). Return origin: ${config.frontendUrl}`);
        console.log('This checks configuration only; it does not prove account activation or webhook delivery.');
        if (process.argv.includes('--provider')) {
            const result = await provider.request('/merchants/capabilities/payment_methods');
            // Capability response shapes can vary. Never assume that merely having a key enables GCash.
            console.log('PayMongo accepted the key. Confirm GCash is enabled in Dashboard > Settings > Payment Methods.');
            console.log('Capability response:', JSON.stringify(result));
        }
    } catch (error) {
        console.error('Payment readiness check failed:', error.message);
        process.exitCode = 1;
    }
})();
