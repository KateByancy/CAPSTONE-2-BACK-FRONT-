const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

export function getApiUrl(): string {
  return configuredApiUrl || "/api";
}

export interface ClientSession {
  id: number;
  fullname: string;
  email: string;
  phone: string;
  address: string;
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
