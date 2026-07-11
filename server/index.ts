import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import db from './db.js';
import {
  loginSmappee,
  fetchChargers,
  clearTokenStore,
  type SmappeeCharger,
} from './smappee.js';
import * as smappee from './smappee.js';

const app = express();
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Auth routes
// ---------------------------------------------------------------------------

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };

  if (!username || !password) {
    res.status(400).json({ error: 'Missing required fields: username, password' });
    return;
  }

  const clientId = process.env.SMAPPEE_CLIENT_ID;
  const clientSecret = process.env.SMAPPEE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    res.status(500).json({ error: 'SMAPPEE_CLIENT_ID / SMAPPEE_CLIENT_SECRET not set in .env' });
    return;
  }

  try {
    await loginSmappee(clientId, clientSecret, username, password);
    res.json({ ok: true });
  } catch (err) {
    res.status(401).json({ error: (err as Error).message });
  }
});

app.post('/api/auth/logout', (_req: Request, res: Response) => {
  clearTokenStore();
  res.json({ ok: true });
});

app.get('/api/auth/status', (_req: Request, res: Response) => {
  res.json({ loggedIn: smappee.tokenStore !== null });
});

// ---------------------------------------------------------------------------
// Chargers route
// ---------------------------------------------------------------------------

app.get('/api/chargers', async (req: Request, res: Response) => {
  if (!smappee.tokenStore) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const clientId = process.env.SMAPPEE_CLIENT_ID;
  const clientSecret = process.env.SMAPPEE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    res.status(500).json({ error: 'SMAPPEE_CLIENT_ID / SMAPPEE_CLIENT_SECRET not configured' });
    return;
  }

  const minKw = parseFloat((req.query.minKw as string) ?? '0') || 0;
  const maxKw = parseFloat((req.query.maxKw as string) ?? '999') || 999;

  try {
    const chargers = await fetchChargers(clientId, clientSecret);

    const filtered = chargers.filter((c: SmappeeCharger) => {
      if (c.capacityKw === null) return true; // unknown — always include
      return c.capacityKw >= minKw && c.capacityKw <= maxKw;
    });

    res.json(filtered);
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
// Start
// ---------------------------------------------------------------------------

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
