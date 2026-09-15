# Password recovery setup

Client forgot-password sends a six-digit verification code to the email saved during registration. The client enters the code and matching new passwords on /forgot-password. Codes expire after 10 minutes, allow five attempts, and work once. Resending replaces the previous code. Existing Google-registered clients can also set a MARC password this way; this does not change their Google password or give the app access to Gmail.

The client code flow shares the Gmail sender configured for admin recovery: ADMIN_RECOVERY_GMAIL_USER and ADMIN_RECOVERY_GMAIL_APP_PASSWORD. Follow [ADMIN_EMAIL_RECOVERY.md](ADMIN_EMAIL_RECOVERY.md) to configure the sender. Use `npm --prefix Backend run admin-email:check -- --verify` to check Gmail authentication without sending email. No client Gmail password is requested or stored.

Run `npm --prefix Backend run db:migrate:client-email` to create the code recovery tables, then restart the backend. Run `npm --prefix Backend run test:client-email` to test registration, recipient matching, password changes, expiry, replay protection, attempts, and delivery failures using temporary tables and mocked email.

Run `npm run db:migrate` from Backend to create the recovery tables. Restart the backend after updating environment settings. Use `npm run dev:backend` from the workspace root for automatic backend reloads; `npm run dev` at the root starts only the frontend.

Admin recovery uses email links delivered by the same Gmail sender. The legacy Twilio endpoints remain available for existing integrations.

The earlier client link endpoints remain available for existing links and integrations, using RESEND_API_KEY and PASSWORD_RESET_FROM. The current client forgot-password form uses Gmail codes and does not require Resend. Production responses never expose codes or email reset tokens.

Email API reference: https://resend.com/docs/api-reference/emails/send-email

The frontend defaults to /api, proxied to http://localhost:5000/api. Custom NEXT_PUBLIC_API_URL or BACKEND_API_URL values must include the /api prefix. A missing-route response after pulling changes usually requires restarting the backend process serving that port. Confirm POST /api/auth/admin/forgot-password with an empty JSON object returns 422, not 404.

Run `npm run test:admin-sms` in Backend for admin and client recovery tests using temporary database tables and mocked delivery providers. Tests never send real SMS or email. Real delivery requires configured provider credentials and must be checked separately.
