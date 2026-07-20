import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import db from './db.js';
import { fetchChargers, fetchOperators } from './ocm.js';
import { fetchIrveChargers, fetchIrveOperators } from './irve.js';
const app = express();
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Open Charge Map routes
// ---------------------------------------------------------------------------

app.get('/api/operators', async (req: Request, res: Response) => {
  const apiKey = process.env.OPENCHARGEMAP_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'OPENCHARGEMAP_API_KEY not configured' });
    return;
  }
  try {
    const operators = await fetchOperators(apiKey);
    res.json(operators);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/chargers', async (req: Request, res: Response) => {
  const apiKey = process.env.OPENCHARGEMAP_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'OPENCHARGEMAP_API_KEY not configured' });
    return;
  }

  const minLat = parseFloat(req.query.minLat as string);
  const minLng = parseFloat(req.query.minLng as string);
  const maxLat = parseFloat(req.query.maxLat as string);
  const maxLng = parseFloat(req.query.maxLng as string);

  if (isNaN(minLat) || isNaN(minLng) || isNaN(maxLat) || isNaN(maxLng)) {
    res.status(400).json({ error: 'Missing or invalid bounding box parameters' });
    return;
  }

  const operatorIdsStr = req.query.operatorIds as string;
  const operatorIds = operatorIdsStr ? operatorIdsStr.split(',').map(s => parseInt(s, 10)).filter(n => !isNaN(n)) : undefined;
  const minKw = parseFloat((req.query.minKw as string) ?? '0') || 0;
  const maxKw = parseFloat((req.query.maxKw as string) ?? '999') || 999;

  try {
    const chargers = await fetchChargers(apiKey, minLat, minLng, maxLat, maxLng, operatorIds, minKw, maxKw);
    res.json(chargers);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ---------------------------------------------------------------------------
// IRVE Data.gouv routes
// ---------------------------------------------------------------------------

app.get('/api/irve/operators', async (req: Request, res: Response) => {
  try {
    const operators = await fetchIrveOperators();
    res.json(operators);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/irve/chargers', async (req: Request, res: Response) => {
  const minLat = parseFloat(req.query.minLat as string);
  const minLng = parseFloat(req.query.minLng as string);
  const maxLat = parseFloat(req.query.maxLat as string);
  const maxLng = parseFloat(req.query.maxLng as string);

  if (isNaN(minLat) || isNaN(minLng) || isNaN(maxLat) || isNaN(maxLng)) {
    res.status(400).json({ error: 'Missing or invalid bounding box parameters' });
    return;
  }

  const operatorIdsStr = req.query.operatorIds as string;
  const operatorIds = operatorIdsStr ? operatorIdsStr.split(',').filter(Boolean) : undefined;
  const minKw = parseFloat((req.query.minKw as string) ?? '0') || 0;
  const maxKw = parseFloat((req.query.maxKw as string) ?? '999') || 999;

  try {
    const chargers = await fetchIrveChargers(minLat, minLng, maxLat, maxLng, operatorIds, minKw, maxKw);
    res.json(chargers);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ---------------------------------------------------------------------------
// Categories routes
// ---------------------------------------------------------------------------

app.get('/api/categories', (_req: Request, res: Response) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
  res.json(categories);
});

app.post('/api/categories', (req: Request, res: Response) => {
  const { name, color, emoji } = req.body as {
    name?: unknown;
    color?: unknown;
    emoji?: unknown;
  };

  if (typeof name !== 'string' || name.trim() === '') {
    res.status(400).json({ error: 'name must be a non-empty string' });
    return;
  }
  if (color !== undefined && (typeof color !== 'string' || !color.startsWith('#'))) {
    res.status(400).json({ error: 'color must be a string starting with #' });
    return;
  }
  if (emoji !== undefined && typeof emoji !== 'string') {
    res.status(400).json({ error: 'emoji must be a string' });
    return;
  }

  const stmt = db.prepare(
    'INSERT INTO categories (name, color, emoji) VALUES (?, ?, ?)'
  );
  const info = stmt.run(name, color ?? null, emoji ?? null);
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(category);
});

app.put('/api/categories/:id', (req: Request<{ id: string }>, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const { name, color, emoji } = req.body as { name?: string; color?: string; emoji?: string };

  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({ error: 'name must be a non-empty string' });
      return;
    }
    db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(name, id);
  }

  if (color !== undefined) {
    if (typeof color !== 'string' || !color.startsWith('#')) {
      res.status(400).json({ error: 'color must be a string starting with #' });
      return;
    }
    db.prepare('UPDATE categories SET color = ? WHERE id = ?').run(color, id);
  }

  if (emoji !== undefined) {
    if (typeof emoji !== 'string') {
      res.status(400).json({ error: 'emoji must be a string' });
      return;
    }
    db.prepare('UPDATE categories SET emoji = ? WHERE id = ?').run(emoji, id);
  }

  const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  res.json(updated);
});

app.delete('/api/categories/:id', (req: Request<{ id: string }>, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const info = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  if (info.changes === 0) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Pins routes
// ---------------------------------------------------------------------------

app.get('/api/pins', (_req: Request, res: Response) => {
  const pins = db.prepare(`
    SELECT p.*, c.name as category_name, c.color as category_color, c.emoji as category_emoji
    FROM pins p
    LEFT JOIN categories c ON p.category_id = c.id
    ORDER BY p.id
  `).all();
  res.json(pins);
});

app.post('/api/pins', (req: Request, res: Response) => {
  const { lat, lng, color, label, address, category_id } = req.body as {
    lat?: unknown;
    lng?: unknown;
    color?: unknown;
    label?: unknown;
    address?: unknown;
    category_id?: unknown;
  };

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    res.status(400).json({ error: 'lat and lng must be numbers' });
    return;
  }
  if (typeof color !== 'string' || !color.startsWith('#')) {
    res.status(400).json({ error: 'color must be a string starting with #' });
    return;
  }
  if (typeof label !== 'string') {
    res.status(400).json({ error: 'label must be a string' });
    return;
  }
  if (category_id !== undefined && category_id !== null && typeof category_id !== 'number') {
    res.status(400).json({ error: 'category_id must be a number or null' });
    return;
  }

  const stmt = db.prepare(
    'INSERT INTO pins (lat, lng, color, label, address, category_id) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const info = stmt.run(lat, lng, color, label, typeof address === 'string' ? address : '', (category_id as number | null) ?? null);
  const pin = db.prepare('SELECT * FROM pins WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(pin);
});

app.put('/api/pins/:id', (req: Request<{ id: string }>, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const { color, label, address, category_id } = req.body as { color?: string; label?: string; address?: string; category_id?: number | null };

  const existing = db.prepare('SELECT * FROM pins WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: 'Pin not found' });
    return;
  }

  if (color !== undefined) {
    if (typeof color !== 'string' || !color.startsWith('#')) {
      res.status(400).json({ error: 'color must be a string starting with #' });
      return;
    }
    db.prepare('UPDATE pins SET color = ? WHERE id = ?').run(color, id);
  }

  if (label !== undefined) {
    if (typeof label !== 'string') {
      res.status(400).json({ error: 'label must be a string' });
      return;
    }
    db.prepare('UPDATE pins SET label = ? WHERE id = ?').run(label, id);
  }

  if (address !== undefined) {
    if (typeof address !== 'string') {
      res.status(400).json({ error: 'address must be a string' });
      return;
    }
    db.prepare('UPDATE pins SET address = ? WHERE id = ?').run(address, id);
  }

  if ('category_id' in req.body) {
    if (category_id !== null && typeof category_id !== 'number') {
      res.status(400).json({ error: 'category_id must be a number or null' });
      return;
    }
    db.prepare('UPDATE pins SET category_id = ? WHERE id = ?').run(category_id ?? null, id);
  }

  const updated = db.prepare('SELECT * FROM pins WHERE id = ?').get(id);
  res.json(updated);
});

app.delete('/api/pins/:id', (req: Request<{ id: string }>, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const info = db.prepare('DELETE FROM pins WHERE id = ?').run(id);
  if (info.changes === 0) {
    res.status(404).json({ error: 'Pin not found' });
    return;
  }
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Proxy route for Météo France WMS
// ---------------------------------------------------------------------------

let cachedMfToken = '';
let mfTokenExpiresAt = 0;

async function getMeteoFranceToken(): Promise<string> {
  // Try to use legacy static token if present, otherwise fetch dynamically
  const staticToken = process.env.VITE_METEO_FRANCE_TOKEN;
  if (staticToken && !process.env.METEO_FRANCE_APP_ID) {
    return staticToken;
  }

  const appId = process.env.METEO_FRANCE_APP_ID;
  if (!appId) {
    throw new Error('METEO_FRANCE_APP_ID is not configured');
  }

  const now = Date.now();
  if (cachedMfToken && now < mfTokenExpiresAt) {
    return cachedMfToken;
  }

  console.log('[WMS Proxy] Fetching new Météo-France token...');
  const res = await fetch('https://portail-api.meteofrance.fr/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${appId}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to get Météo-France token: ${res.status} - ${errText}`);
  }

  const data = await res.json() as any;
  cachedMfToken = data.access_token;
  // Refresh token 1 minute before expiration
  mfTokenExpiresAt = now + ((data.expires_in - 60) * 1000);
  
  return cachedMfToken;
}

app.get('/api/meteofrance-wms', async (req: Request, res: Response) => {
  let mfToken = '';
  try {
    // If API Key is provided, we skip OAuth token fetching completely
    if (!process.env.METEO_FRANCE_API_KEY) {
      mfToken = await getMeteoFranceToken();
    }
  } catch (err) {
    res.status(500).send((err as Error).message);
    return;
  }

  // Météo France REST path for GetMap
  const targetUrl = new URL('https://public-api.meteofrance.fr/public/arome/1.0/wms/MF-NWP-HIGHRES-AROME-001-FRANCE-WMS/GetMap');
  
  let reqWidth = 512;
  let reqHeight = 512;
  let bboxArr: number[] = [];
  let isWms130 = false;

  for (const [key, value] of Object.entries(req.query)) {
    const valStr = String(value);
    const keyLower = key.toLowerCase();
    
    if (keyLower === 'width') reqWidth = parseInt(valStr, 10);
    else if (keyLower === 'height') reqHeight = parseInt(valStr, 10);
    else if (keyLower === 'bbox') bboxArr = valStr.split(',').map(Number);
    else if (keyLower === 'version' && valStr === '1.3.0') isWms130 = true;
    
    targetUrl.searchParams.append(key, valStr);
  }

  // WMS aspect ratio fix:
  // Météo-France adds transparent padding if the requested width/height don't match the BBOX aspect ratio.
  // By adjusting the height sent to Météo-France, we force them to return a non-padded image.
  // The browser will then stretch it back to a square (which perfectly simulates Web Mercator projection).
  if (bboxArr.length === 4) {
    // For WMS 1.3.0 with EPSG:4326, bbox is minY, minX, maxY, maxX (lat, lon)
    const minY = bboxArr[0];
    const minX = bboxArr[1];
    const maxY = bboxArr[2];
    const maxX = bboxArr[3];
    
    const widthDeg = maxX - minX;
    const heightDeg = maxY - minY;
    
    if (widthDeg > 0 && heightDeg > 0) {
      const ar = widthDeg / heightDeg;
      const optimizedHeight = Math.round(reqWidth / ar);
      targetUrl.searchParams.set('height', String(optimizedHeight));
      
      // We must ALSO adjust the BBOX so its aspect ratio exactly matches reqWidth/optimizedHeight.
      // Otherwise, MapServer will still add 1 pixel of transparent padding due to float rounding differences.
      const exactHeightDeg = widthDeg * (optimizedHeight / reqWidth);
      const newMaxY = minY + exactHeightDeg;
      targetUrl.searchParams.set('bbox', `${minY},${minX},${newMaxY},${maxX}`);
    }
  }

  console.log(`[WMS Proxy] Requesting BBOX: ${bboxArr.join(',')} -> W:${reqWidth} H:${targetUrl.searchParams.get('height')}`);

  try {
    let fetchRes;
    let retries = 3;
    let delay = 300;

    while (retries > 0) {
      console.log(`[WMS Proxy] Fetching from Météo-France (Attempt ${4 - retries}/3)...`);
      
      const headers: Record<string, string> = {};
      if (process.env.METEO_FRANCE_API_KEY) {
        headers['apikey'] = process.env.METEO_FRANCE_API_KEY;
      } else {
        headers['Authorization'] = `Bearer ${mfToken}`;
      }

      fetchRes = await fetch(targetUrl.toString(), { headers });

      console.log(`[WMS Proxy] Météo-France returned status: ${fetchRes.status}`);

      if (fetchRes.status === 429) {
        retries--;
        if (retries === 0) {
          console.log(`[WMS Proxy] Max retries reached for 429. Giving up.`);
          break;
        }
        console.log(`[WMS Proxy] Rate limited (429). Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        delay *= 2; // Exponential backoff
        continue;
      }
      break;
    }

    if (!fetchRes || !fetchRes.ok) {
      const errText = fetchRes ? await fetchRes.text() : 'Failed';
      console.error(`[WMS Proxy] Error from Météo-France: ${fetchRes?.status} - ${errText.substring(0, 200)}`);
      res.status(fetchRes?.status || 500).send(errText);
      return;
    }

    const arrayBuffer = await fetchRes.arrayBuffer();
    console.log(`[WMS Proxy] Success! Sending ${arrayBuffer.byteLength} bytes to browser.`);
    res.status(fetchRes.status);
    res.set('Content-Type', fetchRes.headers.get('Content-Type') || 'image/png');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error(`[WMS Proxy] Internal Exception:`, err);
    res.status(500).send((err as Error).message);
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
