# Admin SMS password recovery

1. Run `npm run db:migrate:admin-sms` from Backend (also included in the normal table migration).
2. Create a dedicated Twilio Verify service for admin password recovery, with SMS enabled. Configure `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_VERIFY_SERVICE_SID` in the backend environment. Never place these values in frontend variables or commit them.
3. Enable the destination country in Twilio's Verify geographic permissions and ensure the account can send to the destination number. Trial accounts may require a verified recipient. Restart the backend after configuring it.
4. Save the admin's accessible mobile number in Admin Profile Settings. Philippine `09XXXXXXXXX` and `639XXXXXXXXX` formats are normalized to `+639XXXXXXXXX`; international numbers must include their country code with `+`.
5. Open `/admin`, select **Forgot password?**, and enter the mobile number saved in Admin Profile Settings. Enter the received SMS code and matching new passwords. Return to admin login and use the new password.

The request never accepts a replacement destination phone. An opaque recovery challenge is returned for unknown numbers, client-only numbers, missing saved phone numbers, and numbers shared by multiple admins without exposing account details. Codes are checked by Twilio, never returned by the application or logged. Challenges expire after ten minutes and allow five checks. Database-backed send limits allow five requests per IP and three per normalized phone number per 15-minute bucket; checks allow twenty per IP. Behind a proxy, configure Express trusted proxies narrowly so `req.ip` reflects the intended client; do not trust arbitrary forwarded headers.

The saved database password takes precedence over `ADMIN_PASSWORD`; environment credentials only bootstrap an admin that has no saved password. Existing admin sessions and outstanding SMS challenges stop working when the password changes. A profile phone change invalidates outstanding challenges. Recovery never changes the phone number or creates an admin account. Existing client email recovery remains separate.

Run `npm run test:admin-sms` for automated mocked-provider checks. For deployment verification, request one real code with the admin's authorization, test an incorrect code, then reset with the correct code. Confirm the new password works, the old password fails, and code replay fails. Live SMS requires configured Twilio credentials and a reachable saved number; automated checks do not establish delivery.

Provider references: [Start verification](https://www.twilio.com/docs/verify/api/verification), [Check verification](https://www.twilio.com/docs/verify/api/verification-check).
