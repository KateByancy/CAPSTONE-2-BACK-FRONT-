# Deploy live GCash payments

## What is implemented

Admin creates an agreed booking payment request; client pays through PayMongo hosted GCash checkout. The backend verifies the saved checkout ID, amount, PHP currency, GCash source and live/test mode before recording Paid. Redirects never mark a payment paid. Signed webhooks update the database even when neither payment page is open; page refresh remains a fallback. Duplicate notifications do not apply a paid update twice.

The code is prepared for live configuration. It is not an activated merchant account or an already deployed payment service. This project currently uses the v1 Checkout Session API; no API-version migration is required by this guide. The webhook accepts both the existing v1 event envelope and the `send.webhook` envelope documented by PayMongo, then independently retrieves and verifies the checkout before recording Paid.

Start by identifying your frontend host/domain, backend host/domain, production database host, and merchant activation status. Keep your local `.env` in test mode. Add live secrets only to the deployed backend's secret settings; do not send them in chat. Existing authentication settings remain unchanged.

## 1. Activate the merchant account

Use the business owner's PayMongo account. Complete the identity/business requirements requested in the dashboard. Request GCash activation under Settings > Payment Methods and wait for approval. PayMongo's current checklist says GCash requires a registered business type; an Individual account must complete the business-type upgrade first. Confirm wallet/payout setup and the destination in the merchant dashboard. Client collections go through this merchant account; creating an admin user in this app does not create a separate PayMongo account.

Official guide: https://docs.paymongo.com/docs/get-started-go-live-checklist

## 2. Choose public deployment addresses

You need a publicly reachable HTTPS frontend, a running Node/Express backend, and a persistent database compatible with the repository's migrations. The existing migrations use ADD COLUMN IF NOT EXISTS; check support on your database version before production migration. Use a staging database to rehearse the migration first.

Example addresses used below:

- Frontend: https://app.example.com
- Backend: https://api.example.com

Replace them with your actual addresses. The backend must accept external HTTPS requests to /api/payment/webhook without a login screen, platform password gate, or browser challenge.

## 3. Prepare production data

Back up existing data before migrations. Use a separate production database with real accounts/bookings. Do not copy simulated Paid transactions from the test database into live financial records. Existing test checkout sessions cannot be resumed using live keys. If this database already contains real payments, preserve them and reconcile with PayMongo before migrating; never clear checkout locks or delete records simply to retry collection.

From Backend, with the intended database environment configured:

```powershell
npm ci
npm run db:migrate
```

For an existing installation whose base schema is already ready, the payment migration alone is `npm run db:migrate:gcash`. Do not run database_schema.sql against existing data; it includes destructive reset statements.

## 4. Register the live webhook

In PayMongo's live environment, create a webhook with:

- URL: https://api.example.com/api/payment/webhook
- Event: checkout_session.payment.paid

Use the Developers webhook controls, or the documented Create Webhook API if your dashboard does not expose them. Copy that endpoint's signing secret into the backend environment as PAYMONGO_WEBHOOK_SECRET. This is separate from the API secret key. Register the webhook before the first live checkout. Monitor deliveries in PayMongo and confirm it remains enabled.

Official setup and signature format: https://docs.paymongo.com/docs/developer-tools-webhook-setup-management

## 5. Configure backend secrets and start it

Use your hosting provider's secret/environment settings. Never commit actual secrets or put them in NEXT_PUBLIC variables.

```dotenv
NODE_ENV=production
PAYMENTS_MODE=live
PAYMONGO_SECRET_KEY=sk_live_REPLACE_WITH_YOUR_PRIVATE_KEY
PAYMONGO_WEBHOOK_SECRET=REPLACE_WITH_THIS_LIVE_ENDPOINT_SECRET
PAYMONGO_WEBHOOK_URL=https://api.example.com/api/payment/webhook
FRONTEND_URL=https://app.example.com
DB_HOST=YOUR_DATABASE_HOST
DB_PORT=3306
DB_USER=YOUR_DATABASE_USER
DB_PASSWORD=YOUR_DATABASE_PASSWORD
DB_NAME=YOUR_PRODUCTION_DATABASE
JWT_SECRET=YOUR_STRONG_RANDOM_SECRET
```

Preserve the other required app settings from .env.example, including admin configuration. Configure database transport/security according to your host; the current DB module does not configure TLS options. If your host requires database TLS, add its CA/settings before deployment. Set PORT as required by the backend host.

```powershell
npm run payments:check
npm run payments:check -- --live --webhook
npm start
```

The basic check validates configuration only. `--live` additionally refuses test mode; `--webhook` makes a read-only request to PayMongo and verifies the endpoint URL, live/test mode, enabled status, `checkout_session.payment.paid` subscription and matching signing secret. It never prints that secret. `PAYMONGO_WEBHOOK_URL` is used by this check; it does not register a webhook or change your server routes. Neither command creates payments. A successful check does not prove GCash activation or public delivery. Production startup rejects test keys, a missing webhook secret, and a non-HTTPS frontend origin. Placeholders do not establish valid credentials.

Open `https://api.example.com/api/health` and confirm the response reports `healthy` and database `connected`. An unsigned POST to `/api/payment/webhook` should receive 401 when payment configuration is valid; that proves the route rejects unsigned requests, not that PayMongo can deliver a valid one. Opening the webhook URL in a browser uses GET and is not a valid webhook test.

If a hosting provider needs the service online before webhook registration, register the URL through the provider API first or complete the setup in staging. Do not temporarily bypass production checks to collect payments.

## 6. Configure and deploy the frontend

Set the frontend server environment before building:

```dotenv
BACKEND_API_URL=https://api.example.com/api
```

Keep NEXT_PUBLIC_API_URL unset to use the frontend's /api proxy. Alternatively, set it to https://api.example.com/api for direct browser requests; the backend FRONTEND_URL must allow the frontend origin. Both forms require the /api suffix.

From Frontend:

```powershell
npm ci
npm run build
npm start
```

For managed hosting, use those equivalent build/start settings and set the project root to Frontend. Configure the backend as its own service rooted at Backend. The root `npm start` launches only the frontend. Choose a backend that stays available for webhook delivery and a persistent MariaDB-compatible database. Do not deploy this Next.js app as a static-only export: its default API proxy needs a server. Set frontend environment variables before building and rebuild after changing the backend URL.

## 7. Verify readiness before customer use

First run automated checks with mocked providers and the database integration suite against staging:

```powershell
# In Backend
npm run test:payments-production
npm run test:gcash
```

Then, when the merchant approves an actual charge, make one controlled real transaction through the live site (the app minimum is PHP 100):

1. Sign in as a real client and submit a booking; admin accepts it.
2. Admin opens Payments and requests the agreed amount.
3. Client opens Payments, confirms the amount, and completes GCash checkout.
4. Close the payment pages and check PayMongo's webhook delivery received HTTP 200.
5. Reopen both dashboards. Confirm the request is Paid and the provider amount/transaction matches.
6. Re-deliver the same event from PayMongo and confirm it produces no second payment update.
7. Confirm the transaction and subsequent settlement in PayMongo. Refunds, if needed, are handled through the merchant's provider workflow; this app does not implement refunds.

This step uses real money. Automated tests do not establish merchant activation, actual GCash delivery, webhook reachability or settlement.

PayMongo's dashboard test-event tool always sends `livemode=false`. This live handler deliberately rejects that event in live mode. Test simulated events against a separately configured test endpoint; validate the live endpoint with a controlled live transaction and its real delivery. Do not weaken the mode or signature checks to make the test-event button pass.

Official event-mode reference: https://docs.paymongo.com/docs/developer-tools-webhooks-key-concepts

Record the following before enabling customer payments: merchant/GCash approval, deployed frontend/backend URLs, passing health check, passing `--live --webhook` check, live transaction ID, webhook HTTP 200, and matching Paid status on both dashboards. Keep API keys and webhook signing secrets out of this record.

## Troubleshooting

- Test-mode banner: the deployed backend still reports test configuration; check deployed variables and restart the correct service.
- Startup configuration error: correct the named live key, signing secret or origin setting.
- Webhook 401: wrong signing secret/mode, altered raw body, or server clock more than five minutes out of sync.
- Webhook 503: database/provider unavailable or checkout creation has not yet saved the session; PayMongo should retry. Investigate persistent failures and disabled webhooks.
- Paid at provider but pending here: inspect webhook deliveries; refresh to re-fetch provider status. Never ask the client to pay again until reconciled.
- Checkout locked/expired: reconcile the GCASH-{request id} reference in PayMongo before manually repairing the stored session. The app deliberately avoids automatically issuing a second checkout after an ambiguous timeout.
