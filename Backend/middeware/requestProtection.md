Request protection is mounted once at `/api`, before JSON parsing and existing routes.
The signature-verified PayMongo webhook is mounted first and remains exempt.
OPTIONS requests are exempt. Requests, including unsuccessful attempts, count by IP
(IPv6 addresses share a /64 bucket). Limits are shared across IDs and aliases within
each scope, so rotating an email, token, checkout ID, or login route does not reset them.

| Scope | Requests | Window |
| --- | ---: | --- |
| All API requests | 600 | 1 minute |
| All POST/PUT/PATCH/DELETE requests | 120 | 1 minute |
| Client login, Admin login, Google login combined | 30 | 15 minutes |
| Registration | 10 | 1 hour |
| Password recovery/reset routes combined | 20 | 15 minutes |
| Booking, schedule, design creation combined | 30 | 15 minutes |
| Inquiry submission | 10 | 15 minutes |
| Chat send | 60 | 1 minute |
| Payment checkout creation across IDs | 20 | 1 minute |

Existing recovery email limits remain in place. Blocked requests return JSON with
HTTP 429, `Retry-After` in seconds, and `Cache-Control: no-store`. Counters expire
automatically. At most 10,000 counters are retained; new counters are temporarily
refused at capacity rather than evicting active protection.

Counters are local to each Node process and reset on restart. This protects the
current API process; it does not provide shared limits across multiple replicas or
network-level denial-of-service protection.

Direct connections require no configuration. Behind a reverse proxy, set
`ANTI_BOT_TRUSTED_PROXIES` to the actual proxy IP addresses or CIDR subnets, separated
by commas. Leave it unset for direct access. Never set it to an unrestricted network.
Untrusted forwarded headers are ignored by Express. Limits are defined in
`requestProtection.js`; no database, external service, or JWT changes are required.

Run the protection tests with `node tests/requestProtection.test.js`.
