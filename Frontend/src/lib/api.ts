const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

export function getApiUrl(): string {
  return configuredApiUrl || "/api";
}

export function formatClientName(fullName: string): string {
  const trimmedName = fullName.trim();
  if (!trimmedName) return "Client User";
  const nameParts = trimmedName.replace(/,/g, " ").split(/\s+/).filter(Boolean);
  if (nameParts.length < 2) return nameParts[0];

  const lastName = nameParts.at(-1);
  const firstName = nameParts[0];
  const middleNames = nameParts.slice(1, -1).join(" ");
  return middleNames ? `${lastName}, ${firstName}, ${middleNames}` : `${lastName}, ${firstName}`;
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
