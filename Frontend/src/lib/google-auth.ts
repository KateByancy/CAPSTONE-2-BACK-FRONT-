import { getApiUrl } from '@/lib/api';

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

function loadGoogleScript(): Promise<void> {
  if (window.google) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Unable to load Google sign-in.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = GOOGLE_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load Google sign-in.'));
    document.head.appendChild(script);
  });
}

async function getGoogleClientId(): Promise<string> {
  const response = await fetch(`${getApiUrl()}/auth/google-config`);
  const result: { enabled?: boolean; clientId?: string; message?: string } = await response.json();
  if (!response.ok || !result.enabled || !result.clientId) throw new Error(result.message || 'Google sign-in has not been configured.');
  return result.clientId;
}

export async function renderGoogleButton(element: HTMLElement, onCredential: (credential: string) => void): Promise<void> {
  const [clientId] = await Promise.all([getGoogleClientId(), loadGoogleScript()]);
  if (!window.google) throw new Error('Google sign-in is unavailable.');
  element.replaceChildren();
  window.google.accounts.id.initialize({ client_id: clientId, callback: ({ credential }) => onCredential(credential), ux_mode: 'popup' });
  window.google.accounts.id.renderButton(element, {
    type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', width: Math.min(400, Math.max(240, Math.floor(element.clientWidth))),
  });
}
