import Database from 'better-sqlite3';

const db = new Database('./server/pins.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    color      TEXT    NOT NULL DEFAULT '#3498db',
    emoji      TEXT    NOT NULL DEFAULT '📍',
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pins (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    lat         REAL    NOT NULL,
    lng         REAL    NOT NULL,
    color       TEXT    NOT NULL DEFAULT '#e74c3c',
    label       TEXT    NOT NULL DEFAULT '',
    address     TEXT    NOT NULL DEFAULT '',
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

// Migrate: add category_id to pins if it doesn't exist yet
const pinsCols = db.prepare("PRAGMA table_info(pins)").all() as { name: string }[];
if (pinsCols.length > 0 && !pinsCols.some(c => c.name === 'category_id')) {
  db.exec('ALTER TABLE pins ADD COLUMN category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL');
}

// Migrate: add address to pins if it doesn't exist yet
const pinCols = (db.pragma('table_info(pins)') as Array<{ name: string }>).map(c => c.name);
if (!pinCols.includes('address')) {
  db.exec(`ALTER TABLE pins ADD COLUMN address TEXT NOT NULL DEFAULT ''`);
}

export default db;
