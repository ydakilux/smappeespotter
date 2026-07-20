import fetch from 'node-fetch';

const BASE_URL = 'https://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/bornes-irve/records';

export interface IrveOperator {
  id: string;
  name: string;
}

export async function fetchIrveOperators(): Promise<IrveOperator[]> {
  const url = `${BASE_URL}?group_by=nom_amenageur&limit=10000`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch IRVE operators: ${res.status}`);
  }
  const data = await res.json() as any;
  const results = data.results || [];
  
  return results
    .filter((r: any) => r.nom_amenageur)
    .map((r: any) => ({
      id: r.nom_amenageur,
      name: r.nom_amenageur,
    }))
    .sort((a: IrveOperator, b: IrveOperator) => a.name.localeCompare(b.name));
}

export async function fetchIrveChargers(
  minLat: number,
  minLng: number,
  maxLat: number,
  maxLng: number,
  operatorIds?: string[],
  minKw?: number,
  maxKw?: number
): Promise<any[]> {
  const url = new URL(BASE_URL);
  
  let where = `consolidated_latitude >= ${minLat} and consolidated_latitude <= ${maxLat} and consolidated_longitude >= ${minLng} and consolidated_longitude <= ${maxLng}`;
  
  if (minKw !== undefined && minKw > 0) {
    where += ` and puissance_nominale >= ${minKw}`;
  }
  if (maxKw !== undefined && maxKw < 350) {
    where += ` and puissance_nominale <= ${maxKw}`;
  }
  
  if (operatorIds && operatorIds.length > 0) {
    const opsStr = operatorIds.map(id => `"${id}"`).join(',');
    where += ` and nom_amenageur in (${opsStr})`;
  }

  url.searchParams.append('where', where);
  url.searchParams.append('limit', '100');

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Failed to fetch IRVE chargers: ${res.status}`);
  }

  const data = await res.json() as any;
  const records = data.results || [];

  const uniqueRecords = new Map<string, any>();
  for (const r of records) {
    const lat = r.consolidated_latitude ?? r.coordonneesxy?.lat;
    const lng = r.consolidated_longitude ?? r.coordonneesxy?.lon;
    if (lat !== undefined && lng !== undefined && lat !== null && lng !== null) {
      const id = r.id_station_itinerance || r.id_station_local || r.id_pdc_itinerance || r.id_pdc_local || `${lat}_${lng}`;
      if (!uniqueRecords.has(id)) {
        uniqueRecords.set(id, r);
      } else {
        // optionally update max power and connections count
        const existing = uniqueRecords.get(id);
        const pKw = parseFloat(r.puissance_nominale);
        const existingKw = parseFloat(existing.puissance_nominale);
        if (!isNaN(pKw) && (!isNaN(existingKw) ? pKw > existingKw : true)) {
          existing.puissance_nominale = pKw;
        }
        existing.nbre_pdc = (parseInt(existing.nbre_pdc) || 1) + (parseInt(r.nbre_pdc) || 1);
      }
    }
  }

  return Array.from(uniqueRecords.values()).map((record: any) => {
    const pKw = parseFloat(record.puissance_nominale);
    return {
      id: record.id_station_itinerance || record.id_station_local || record.id_pdc_itinerance || record.id_pdc_local || Math.random().toString(),
      name: record.nom_station || 'Station IRVE',
      lat: record.consolidated_latitude ?? record.coordonneesxy?.lat,
      lon: record.consolidated_longitude ?? record.coordonneesxy?.lon,
      operatorName: record.nom_amenageur || record.nom_operateur || 'Unknown',
      capacityKw: !isNaN(pKw) && pKw > 0 ? pKw : null,
      address: record.adresse_station || '',
      connectionsCount: parseInt(record.nbre_pdc) || 1,
    };
  });
}
