const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

export function getApiUrl(): string {
  return configuredApiUrl || "/api";
}

/** Keep upstream/proxy errors from being replaced by a JSON SyntaxError. */
export async function readApiResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    const result: unknown = JSON.parse(text);
    if (result && typeof result === 'object' && !Array.isArray(result)) return result as T;
  } catch {
    // Hosting platforms can return plain text or HTML before Express is reached.
  }
  const contentType = response.headers.get('content-type') || '';
  const detail = !contentType.includes('html') && !/<[a-z!][\s\S]*>/i.test(text)
    ? text.trim().replace(/\s+/g, ' ').slice(0, 300)
    : '';
  throw new Error(`The API returned an unexpected response (HTTP ${response.status}).${detail ? ` ${detail}` : ' Please try again or contact support.'}`);
}

export function formatClientName(fullName: string): string {
  const trimmedName = fullName.trim().replace(/\s+/g, ' ');
  if (!trimmedName) return "Client User";
  // A comma explicitly identifies surname-first input, including compound surnames.
  const commaIndex = trimmedName.indexOf(',');
  const parts = trimmedName.split(' ');
  if (commaIndex < 0 && parts.length < 2) return trimmedName;
  const lastName = commaIndex >= 0 ? trimmedName.slice(0, commaIndex).trim() : parts.pop()!;
  const givenNames = (commaIndex >= 0 ? trimmedName.slice(commaIndex + 1).replace(/,/g, ' ') : parts.join(' '))
    .trim().split(/\s+/).filter(Boolean)
    .map(part => /^\p{L}\.?$/u.test(part) ? `${part.replace('.', '').toUpperCase()}.` : part)
    .join(' ');
  return givenNames ? `${lastName}, ${givenNames}` : lastName;
}

export interface ClientSession {
  id: number;
  fullname: string;
  email: string;
  phone: string;
  address: string;
  landmark?: string;
}

export function getClientSession(): ClientSession | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem("clientAccount");
    return stored ? (JSON.parse(stored) as ClientSession) : null;
  } catch {
    return null;
  }
}

export async function requestProfile(
  role: 'admin' | 'client',
  id: number,
  changes?: Partial<Pick<ClientSession, 'fullname' | 'phone' | 'address' | 'landmark'>>,
  signal?: AbortSignal,
): Promise<ClientSession> {
  const token = localStorage.getItem(`${role}Token`);
  if (!token) throw new Error('Please sign in again to access your profile.');
  const response = await fetch(`${getApiUrl()}/profile/${id}`, {
    method: changes ? 'PUT' : 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: changes ? JSON.stringify(changes) : undefined,
    cache: 'no-store',
    signal,
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.success || !result.profile) {
    throw new Error(result?.message || `Unable to ${changes ? 'save' : 'load'} profile (HTTP ${response.status}). Please try again.`);
  }
  const profile: ClientSession = result.profile;
  localStorage.setItem(`${role}Account`, JSON.stringify(profile));
  window.dispatchEvent(new Event('profile-updated'));
  return profile;
}

/** Send the current workspace token only to this application's API. */
export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const target = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, window.location.origin);
  const api = new URL(getApiUrl(), window.location.origin);
  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init.headers).forEach((value,key)=>headers.set(key,value));
  if (target.origin === api.origin && (target.pathname === api.pathname || target.pathname.startsWith(api.pathname + '/'))) {
    const role = window.location.pathname.startsWith('/admin') ? 'admin' : 'client';
    const token = localStorage.getItem(role + 'Token');
    if (token && !headers.has('Authorization')) headers.set('Authorization','Bearer '+token);
  }
  return fetch(input,{...init,headers,cache:init.cache || 'no-store'}).then(response=>{
    if(response.status===401 && headers.has('Authorization') && target.origin===api.origin){
      const role=window.location.pathname.startsWith('/admin')?'admin':'client';
      localStorage.removeItem(role+'Token');localStorage.removeItem(role+'Account');
      window.dispatchEvent(new CustomEvent('session-expired',{detail:{role}}));
    }
    return response;
  });
}
