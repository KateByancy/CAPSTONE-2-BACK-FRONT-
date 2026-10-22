# System improvements - 22 October 2026

## Client flow and interface
- Added actionable project stages: explore designs, personalize, request a booking, and manage project payments.
- Kept Numans typography and the existing charcoal, white, cream, and gold palette.
- Added payment progress indicators and an authenticated payment-history timeline, with Philippine timestamps.
- Receipt previews support Escape, keyboard focus containment, and focus restoration.
- A successful payment change stays successful even if the subsequent list refresh fails; the interface directs users to refresh instead of submitting again.
- Pending-booking calendar opens at the current month; cancelled and completed bookings are excluded from pending selection.
- Existing design catalogue, customization estimate, scheduling conflict checks, and admin functions remain connected.

## Access controls
- Booking, schedule, tracking, project concepts, notifications, and client dashboard APIs now require authentication.
- Client identity comes from the verified token, not a submitted user ID. Ownership is checked for individual records and project concepts.
- Booking acceptance, rejection, deletion, fleet locations, and progress changes are restricted to administrators.
- The old client schedule endpoint now uses the existing one-time reschedule rule rather than bypassing acceptance and reschedule limits.
- Inquiry lists and deletion require admin authorization.
- New sessions expire after 8 hours for admins and 24 hours for clients; legacy tokens without expiry are rejected. The UI returns expired sessions to sign-in.
- Authenticated frontend calls attach the workspace token only to the configured API origin/path. Sensitive project/payment responses use no-store.

## Payment safeguards
- Manual payment mutations and audit entries commit in one database transaction. An audit failure rolls the mutation back.
- Added a unique receipt digest for new submissions and duplicate checks against older receipts. This detects identical files; it cannot detect every edited or fraudulent image.
- Existing unique references, one-open-payment-per-booking checks, amount validation, private receipt access, receipt file size/type checks, and admin confirmation remain enforced.
- Receipt resubmission clears outdated review notes. Admin verification checks that the associated booking is still accepted.
- Payment request, receipt, confirmation, return, cancellation, and account-setting changes generate audit entries.
- Bookings with payment records cannot be deleted. Cancellation/rejection is blocked while associated non-cancelled payment records exist, preserving reconciliation history.
- Payment writes/uploads have a dedicated rate limit. API JSON bodies have a 256 KB limit; multipart receipt uploads retain their separate 5 MB limit.
- Payment readiness checks default to the active manual GCash flow. Legacy provider diagnostics remain available through explicit flags.

## Validation and limits
- Tested authorization, expiring sessions, booking conflicts, catalogue persistence, duplicate receipts, payment audit rollback, private payment history, provider signature verification, and mobile payment layout.
- Integration tests use isolated fixture databases. Browser payment checks use simulated data. No funds were moved or real payment status changed during verification.
- The current saved GCash account/QR configuration is incomplete. Configure it in Admin > Payments before issuing new payment requests.
- Manual QR transfers are not automatically verified by this application. Administrators must match the amount, recipient, and reference against actual received funds in GCash before marking Paid.
- New audit history starts with this release; previous events are not reconstructed or fabricated.
- These changes harden the reviewed flows; they are not a certification that every possible vulnerability has been eliminated. Public deployment still requires HTTPS and protected database/backups/secrets.

Access-control approach follows the [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).
