# Connected quotation and payment flow

Admin: open Quotations in the sidebar, or Quotation & chat with client on a booking. Select the project to see its saved design, requirements, and preliminary estimate. Discuss the scope in direct chat, add itemized prices, set the initial payment, and send the quotation. The client can accept the latest sent revision or request changes. Earlier revisions remain visible. Accepted quotations are locked.

Client: open Quotations & Chat in the desktop sidebar, or Review quotations & chat with admin from Pending Bookings or Payments. Review the scope, total, and initial payment before accepting. Project messages use a private conversation keyed to the booking ID, separate from Support Chat. Each new personalized booking starts with an empty thread; older project threads are retained. Direct chat is saved immediately and does not wait for an AI response or email delivery. Email notifications are optional and depend on working sender configuration.

After both booking acceptance and quotation acceptance, the admin requests the agreed deposit in Quotations. After that payment is verified Paid, the same action requests the remaining balance. The server calculates the amount from the immutable quotation and verified payments. It rejects duplicate open requests, arbitrary amounts, stale quotes, cross-client actions, and collection beyond the total. Payment mutations retain their audit records and transaction safeguards.

Existing manual payment creation now delegates to the same quotation checks. Older checkout records must be reconciled before collecting another payment; they are not silently reclassified or deleted. Existing paid/request records remain intact. GCash recipient details and QR must be configured before creating requests. A submitted receipt does not prove funds were received: admin verification in the actual GCash account is still required.

Verification: database integration tests cover revisions, stale and concurrent approvals, ownership, direct two-way chat, deposit/balance calculations, tampered amounts, duplicate requests, and fully paid quotations. Browser checks use simulated data for admin quotation creation, client acceptance, human chat, payment action linkage, and mobile layout. No real funds are moved by these tests.

Admin notifications: the bell refreshes every 10 seconds for new bookings, client support messages, private project messages, and quotation responses. Read status is stored separately per administrator. Notification links open the relevant project or support conversation.

Payment actions: admins use Request deposit / Request remaining balance on the accepted quotation. The issued request appears under Payment requests. Clients use Pay via GCash / Submit receipt to open that exact request and its QR and receipt form. Existing open requests disable another request; all amounts and permissions are rechecked on the server.
