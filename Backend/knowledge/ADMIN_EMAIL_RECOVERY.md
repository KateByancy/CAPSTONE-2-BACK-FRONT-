# Admin recovery through Gmail

The admin forgot-password page sends an email link instead of asking for an SMS code. Twilio is not needed for this page. Client forgot-password sends a six-digit email code through the same Gmail sender configured below.

## One-time setup

1. Choose a Gmail account to send recovery messages. It can also be the admin's email address, but the sender and recipient do not have to be the same.
2. Turn on Google 2-Step Verification for the sender. Create a Google App Password named MARC Recovery. Use that 16-character password, not your normal Google password. App Passwords may be unavailable under some Google account/security policies. If the option is missing, consult Google's account guidance rather than disabling security protections.
3. Fill these existing entries in Backend/.env privately:

   ```dotenv
   ADMIN_RECOVERY_GMAIL_USER=your-sender@gmail.com
   ADMIN_RECOVERY_GMAIL_APP_PASSWORD=your-16-character-app-password
   FRONTEND_URL=http://localhost:3000
   ```

   For deployment, FRONTEND_URL must be your public HTTPS frontend origin. With multiple allowed origins, the first is used in links. Spaces in the App Password are removed automatically. Do not commit or share credentials.

4. From the workspace root:

   ```powershell
   npm --prefix Backend run db:migrate:admin-email
   npm --prefix Backend run admin-email:check -- --verify
   npm run dev:backend
   ```

   The check verifies SMTP authentication without sending mail. The backend host must allow outbound SMTP on port 465. Gmail can block authentication from an unfamiliar server, and sending limits apply; this is not an unlimited transactional email service.

5. The admin account must already exist in the users table with the correct email and admin role. For a new installation, sign in once with the configured ADMIN_EMAIL and ADMIN_PASSWORD to create the admin record. Changing ADMIN_EMAIL later does not overwrite an existing account's saved email or password.
6. Open /admin/forgot-password and enter the registered admin email. Open the newest message, follow its link, enter matching new passwords, then sign in at /admin with the new password. Check spam if needed.

The link expires after 15 minutes. Requesting another link replaces previous links. A password or email change invalidates outstanding links. Resetting the password invalidates existing admin sessions. Unknown emails and client emails receive the same generic response; reset tokens are never returned to the requesting browser. Automated tests use a mocked Gmail transport and temporary database tables; they never send real emails or change actual accounts.

Run `npm --prefix Backend run test:admin-email` to verify recovery, login, expiry, replay protection, concurrent resets, rate limits and mail failure handling.

References: [Google App Passwords](https://support.google.com/accounts/answer/185833), [Nodemailer Gmail setup](https://nodemailer.com/guides/using-gmail).
