Run `npm run db:migrate:gcash` from Backend and restart the backend before using the updated Payments page. The migration adds QR image fields to settings and requests without removing payment data.

In Admin Payments, enter the GCash account name and mobile number, upload the actual QR exported from that GCash account, and save. Choose Admin GCash QR when requesting a booking payment. The client sees that request's saved account and QR automatically, submits the transaction reference and receipt, and the admin verifies the received funds. PayMongo checkout remains available as a separate payment method.

Submitted booking estimates appear automatically in Payments, including pending bookings. They remain preliminary estimates rather than being charged automatically.

Admin messages are saved in chat and emailed with the full message to the client's registered email, including when the client is offline. Configure ADMIN_RECOVERY_GMAIL_USER, ADMIN_RECOVERY_GMAIL_APP_PASSWORD and FRONTEND_URL using the existing Gmail setup. Delivery failures are reported to the admin without removing the saved message.

Run `node tests/clientAdminUpdates.test.js` for isolated QR billing, estimate ownership, and chat delivery checks.
