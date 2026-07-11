import fetch from 'node-fetch';

const BASE_URL = 'https://app1pub.smappee.net';

export interface TokenStore {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Date.now() ms
}

export interface SmappeeCharger {
  serviceLocationId: number;
  name: string;
  lat: number;
  lon: number;
  serialNumber: string | null;
  capacityKw: number | null;
  liveWatts: number | null;
}

// In-memory token store (single user app)
export let tokenStore: TokenStore | null = null;

export function clearTokenStore(): void {
  tokenStore = null;
}

// In-memory charger cache
const chargerCache: { data: SmappeeCharger[] | null; fetchedAt: number } = {
  data: null,
  fetchedAt: 0,
};

const CHARGER_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function inferCapacity(serialNumber: string | null): number | null {
  if (!serialNumber) return null;
  const n = parseInt(serialNumber, 10);
  if (isNaN(n)) return null;
  if (n >= 5000 && n <= 5099) return 7.4;   // EV One
  if (n >= 5820 && n <= 5829) return 22;    // EV Wall Business
  if (n >= 5830 && n <= 5839) return 150;   // EV Base Ultra (DC)
  if (n >= 5840 && n <= 5849) return 11;    // EV Wall Home
  return null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function loginSmappee(
  clientId: string,
  clientSecret: string,
  username: string,
  password: string
): Promise<TokenStore> {
  const params = new URLSearchParams({
    grant_type: 'password',
    client_id: clientId,
    client_secret: clientSecret,
    username,
    password,
  });

  const res = await fetch(`${BASE_URL}/dev/v3/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Smappee login failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  tokenStore = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return tokenStore;
}

export async function refreshSmappeeToken(
  clientId: string,
  clientSecret: string
): Promise<TokenStore> {
  if (!tokenStore) throw new Error('No token to refresh');

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: tokenStore.refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(`${BASE_URL}/dev/v3/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Smappee token refresh failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  tokenStore = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return tokenStore;
}

export async function getValidToken(
  clientId: string,
  clientSecret: string
): Promise<string> {
  if (!tokenStore) throw new Error('Not authenticated');

  // Refresh if within 60 seconds of expiry
  if (Date.now() >= tokenStore.expiresAt - 60_000) {
    await refreshSmappeeToken(clientId, clientSecret);
  }

  return tokenStore!.accessToken;
}

export async function fetchChargers(
  clientId: string,
  clientSecret: string
): Promise<SmappeeCharger[]> {
  // Return cached data if still fresh
  if (chargerCache.data && Date.now() - chargerCache.fetchedAt < CHARGER_CACHE_TTL_MS) {
    return chargerCache.data;
  }

  const token = await getValidToken(clientId, clientSecret);

  // 1. Fetch all service locations
  const locRes = await fetch(`${BASE_URL}/dev/v3/servicelocation`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!locRes.ok) {
    const text = await locRes.text();
    throw new Error(`Failed to fetch service locations (${locRes.status}): ${text}`);
  }

  const locData = (await locRes.json()) as {
    serviceLocations: Array<{ serviceLocationId: number; name: string }>;
  };

  const locations = locData.serviceLocations ?? [];

  // 2. Fetch info for each location with 200 ms delay between calls
  const chargers: SmappeeCharger[] = [];

  for (const loc of locations) {
    await delay(200);

    const freshToken = await getValidToken(clientId, clientSecret);

    const infoRes = await fetch(
      `${BASE_URL}/dev/v3/servicelocation/${loc.serviceLocationId}/info`,
      { headers: { Authorization: `Bearer ${freshToken}` } }
    );

    if (!infoRes.ok) {
      console.warn(
        `Skipping serviceLocation ${loc.serviceLocationId}: HTTP ${infoRes.status}`
      );
      continue;
    }

    const info = (await infoRes.json()) as {
      lat?: number;
      lon?: number;
      electricalVehicleChargingDevices?: Array<{ serialNumber?: string | number }>;
    };

    const lat = info.lat ?? 0;
    const lon = info.lon ?? 0;

    const evDevices = info.electricalVehicleChargingDevices ?? [];

    if (evDevices.length === 0) {
      // Include as a charger location with unknown serial
      chargers.push({
        serviceLocationId: loc.serviceLocationId,
        name: loc.name,
        lat,
        lon,
        serialNumber: null,
        capacityKw: null,
        liveWatts: null,
      });
    } else {
      for (const device of evDevices) {
        const serial = device.serialNumber != null ? String(device.serialNumber) : null;
        chargers.push({
          serviceLocationId: loc.serviceLocationId,
          name: loc.name,
          lat,
          lon,
          serialNumber: serial,
          capacityKw: inferCapacity(serial),
          liveWatts: null,
        });
      }
    }
  }

  chargerCache.data = chargers;
  chargerCache.fetchedAt = Date.now();

  return chargers;
}
