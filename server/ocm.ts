import fetch from 'node-fetch';

const BASE_URL = 'https://api.openchargemap.io/v3';

export interface OcmOperator {
  id: number;
  name: string;
}

export async function fetchOperators(apiKey: string): Promise<OcmOperator[]> {
  const url = `${BASE_URL}/referencedata?key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch operators: ${res.status}`);
  }
  const data = await res.json() as any;
  const operators = data.Operators || [];
  return operators.map((o: any) => ({
    id: o.ID,
    name: o.Title,
  })).sort((a: OcmOperator, b: OcmOperator) => a.name.localeCompare(b.name));
}

export async function fetchChargers(
  apiKey: string,
  minLat: number,
  minLng: number,
  maxLat: number,
  maxLng: number,
  operatorIds?: number[],
  minKw?: number,
  maxKw?: number
): Promise<any[]> {
  const url = new URL(`${BASE_URL}/poi`);
  url.searchParams.append('key', apiKey);
  url.searchParams.append('boundingbox', `(${minLat},${minLng}),(${maxLat},${maxLng})`);
  url.searchParams.append('maxresults', '100');

  if (operatorIds && operatorIds.length > 0) {
    url.searchParams.append('operatorid', operatorIds.join(','));
  }

  if (minKw !== undefined && minKw > 0) {
    url.searchParams.append('minpowerkw', String(minKw));
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Failed to fetch chargers: ${res.status}`);
  }

  const data = await res.json() as any[];
  
  return data.map((poi: any) => {
    let maxPower = 0;
    const equipmentMap = new Map<string, any>();

    if (poi.Connections) {
      for (const conn of poi.Connections) {
        if (conn.PowerKW && conn.PowerKW > maxPower) {
          maxPower = conn.PowerKW;
        }

        const type = conn.ConnectionType?.Title || 'Unknown';
        const powerKw = conn.PowerKW || null;
        const currentType = conn.CurrentType?.Title || null;
        const status = conn.StatusType?.Title || null;

        const key = `${type}-${powerKw}-${currentType}-${status}`;
        if (!equipmentMap.has(key)) {
          equipmentMap.set(key, { type, powerKw, currentType, status, count: 1 });
        } else {
          equipmentMap.get(key).count++;
        }
      }
    }

    return {
      id: poi.ID,
      name: poi.AddressInfo?.Title || 'Unknown Charger',
      lat: poi.AddressInfo?.Latitude,
      lon: poi.AddressInfo?.Longitude,
      operatorName: poi.OperatorInfo?.Title || '(Unknown Provider)',
      capacityKw: maxPower > 0 ? maxPower : null,
      address: poi.AddressInfo?.AddressLine1 || '',
      town: poi.AddressInfo?.Town || undefined,
      state: poi.AddressInfo?.StateOrProvince || undefined,
      postcode: poi.AddressInfo?.Postcode || undefined,
      country: poi.AddressInfo?.Country?.Title || undefined,
      connectionsCount: poi.NumberOfPoints || poi.Connections?.length || 0,
      equipmentDetails: Array.from(equipmentMap.values()),
      rawData: { _source: 'OCM', ...poi }
    };
  }).filter(c => {
    if (maxKw !== undefined && maxKw < 999 && c.capacityKw !== null) {
      return c.capacityKw <= maxKw;
    }
    return true;
  });
}
