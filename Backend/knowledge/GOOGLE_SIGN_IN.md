# Google sign-in setup

The frontend uses Google Identity Services with a popup callback. The backend verifies the ID token with Google's official `google-auth-library` before issuing the app's client session.

1. In Google Cloud Console, create or select an OAuth client of type **Web application**.
2. Add `http://localhost` and `http://localhost:3000` to **Authorized JavaScript origins**. Add the exact production HTTPS origin when deploying. If the consent screen is in Testing, add the accounts you plan to test under Test users.
3. Replace `GOOGLE_CLIENT_ID` in `Backend/.env` with the real client ID ending in `.apps.googleusercontent.com`. A client secret is not used by this ID-token callback flow.
4. Restart the backend, open `http://localhost:3000/?screen=login`, and choose Continue with Google.
5. `GET /api/auth/google-config` should return `enabled: true`. A placeholder or missing ID returns 503 and the login page displays a retry option.

The browser origin must match the Google Cloud configuration. Use localhost for local testing; a plain HTTP LAN IP is not an authorized production origin. No redirect URI is necessary for the current JavaScript popup callback.

Successful sign-in returns an application token and client account. Existing client emails are reused; new Google accounts create client records. Admin accounts must use admin sign-in. Google-created client records start without phone/address details, matching the existing Google account flow.

Verification tests (no real database or Google accounts):

    node --test tests/googleLogin.test.js

References: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid and https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
