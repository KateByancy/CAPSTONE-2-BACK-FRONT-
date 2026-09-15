# GCash with PayMongo

New payment requests use PayMongo hosted GCash checkout. Existing manual requests retain their receipt review workflow.

## Start

1. Configure PAYMONGO_SECRET_KEY in Backend/.env. Keep this server-side. Test keys simulate payments; live collection requires the appropriate live account/key and enabled GCash capability.
2. Run node migrateGcash.js from Backend, then restart the backend. FRONTEND_URL controls the checkout return address (default http://localhost:3000).
3. Admin accepts a booking, opens Payments and requests the agreed amount (minimum PHP 100).
4. Client opens Payments and selects Pay with GCash. The amount comes from the saved admin request, never the client body.
5. The backend retrieves the stored checkout session and verifies a paid GCash payment matching its amount, PHP currency and key mode. It then marks the request Paid. Admin cannot manually mark a PayMongo request paid.

The page checks statuses on load, focus, every 30 seconds while visible, and Refresh. The signed POST /api/payment/webhook endpoint also records verified checkout payments when both pages are closed. Register checkout_session.payment.paid and configure PAYMONGO_WEBHOOK_SECRET for the same mode as your API key. See [PAYMENT_DEPLOYMENT.md](PAYMENT_DEPLOYMENT.md) for live setup, production configuration checks and deployment verification.

## Duplicate prevention and recovery

Concurrent checkout clicks claim the database request once. Later clicks resume the stored checkout URL. A cancelled browser redirect does not mean funds were not collected and does not reset the request. Admin cancellation is allowed only before any receipt or checkout creation.

If a provider creation request times out ambiguously, checkout_creating remains set so another session cannot silently charge the same invoice. Admin must reconcile the GCASH-{request id} reference in PayMongo before a developer clears that flag or attaches the discovered checkout session. Expired sessions likewise require provider reconciliation; no replacement session is automatically created. These cases display a clear error to the client.

Old checkout records remain listed separately and require separate reconciliation. Receipt images for older manual requests remain private. No API key is returned to the frontend.

## Checks

Run node tests/gcash.test.js from Backend. Tests use connection-local temporary database tables and a mocked PayMongo service, without changing real bookings or moving funds. They cover API response arrays, ownership, fixed amounts, duplicate clicks, session reuse, manual-verification rejection, amount/mode mismatches and successful provider confirmation. Frontend checks: TypeScript and ESLint.

If the frontend encounters the previous API response shape, it shows a restart-backend message instead of assigning undefined arrays and crashing.
