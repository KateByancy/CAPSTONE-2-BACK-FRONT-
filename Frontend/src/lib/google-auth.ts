import { apiFetch, getApiUrl } from '@/lib/api';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void; ux_mode?: 'popup' }) => void;
          renderButton: (element: HTMLElement, options: { type: 'standard'; theme: 'outline'; size: 'large'; text: 'continue_with'; shape: 'rectangular'; width: number }) => void;
        };
      };
    };
  }
}

const GOOGLE_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
let googleScriptPromise: Promise<void> | undefined;

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;
  googleScriptPromise = new Promise<void>((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_SCRIPT_URL}"]`);
    const created = !script;
    if (!script) {
      script = document.createElement('script');
      script.src = GOOGLE_SCRIPT_URL;
      script.async = true;
      script.defer = true;
    }
    const element = script;
    const cleanup = () => {
      window.clearTimeout(timeout);
      element.removeEventListener('load', onLoad);
      element.removeEventListener('error', onError);
    };
    const onLoad = () => {
      cleanup();
      if (window.google?.accounts?.id) resolve();
      else { element.remove(); reject(new Error('Google sign-in could not initialize. Please retry.')); }
    };
    const onError = () => {
      cleanup();
      element.remove();
      reject(new Error('Unable to load Google sign-in. Check your connection or browser blocker and retry.'));
    };
    const timeout = window.setTimeout(onError, 15000);
    element.addEventListener('load', onLoad, { once: true });
    element.addEventListener('error', onError, { once: true });
    if (created) document.head.appendChild(element);
  }).catch(error => { googleScriptPromise = undefined; throw error; });
  return googleScriptPromise;
}

async function getGoogleClientId(): Promise<string> {
  const response = await apiFetch(`${getApiUrl()}/auth/google-config`, { cache: 'no-store' });
  const result: { enabled?: boolean; clientId?: string; message?: string } = await response.json();
  if (!response.ok || !result.enabled || !result.clientId) throw new Error(result.message || 'Google sign-in has not been configured.');
  return result.clientId;
}

export async function renderGoogleButton(element: HTMLElement, onCredential: (credential: string) => void): Promise<void> {
  const clientId = await getGoogleClientId();
  await loadGoogleScript();
  if (!element.isConnected) return;
  if (!window.google?.accounts?.id) throw new Error('Google sign-in is unavailable.');
  element.replaceChildren();
  window.google.accounts.id.initialize({ client_id: clientId, callback: ({ credential }) => onCredential(credential), ux_mode: 'popup' });
  window.google.accounts.id.renderButton(element, {
    type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', width: Math.min(400, Math.max(200, Math.floor(element.clientWidth))),
  });
}
