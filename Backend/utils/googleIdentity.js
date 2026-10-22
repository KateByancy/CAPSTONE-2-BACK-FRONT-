const { OAuth2Client } = require('google-auth-library');
let client;
let activeClientId;

function getGoogleClientId() {
  const value = (process.env.GOOGLE_CLIENT_ID || '').trim();
  return /^\d+-[\w-]+\.apps\.googleusercontent\.com$/.test(value) && !/your-google|placeholder|example/i.test(value) ? value : null;
}

async function verifyGoogleCredential(credential) {
  const clientId = getGoogleClientId();
  if (!clientId) throw Object.assign(new Error('Google sign-in has not been configured.'), { status: 503 });
  if (typeof credential !== 'string' || !credential.trim()) throw Object.assign(new Error('Google credential is required.'), { status: 400 });
  if (!client || activeClientId !== clientId) {
    client = new OAuth2Client(clientId);
    activeClientId = clientId;
  }
  let profile;
  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    profile = ticket.getPayload();
  } catch (error) {
    const unavailable = ['ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN', 'ECONNREFUSED'].includes(error.code) || Boolean(error.response?.status >= 500);
    throw Object.assign(new Error(unavailable ? 'Unable to reach Google sign-in verification. Please retry.' : 'Google sign-in could not be verified.'), { status: unavailable ? 502 : 401 });
  }
  if (!profile?.sub || !profile.email) throw Object.assign(new Error('Google sign-in could not be verified.'), { status: 401 });
  if (profile.email_verified !== true) throw Object.assign(new Error('Please verify your email address in your Google account before signing in.'), { status: 403 });
  return profile;
}

module.exports = { getGoogleClientId, verifyGoogleCredential };
