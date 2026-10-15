'use strict';
// SQLite via Node's built-in module (no native build step needed).
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.CENDOOR_DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_FILE = process.env.CENDOOR_DB || path.join(DATA_DIR, 'cendoor.db');
const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS shops (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  city TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  lang TEXT DEFAULT 'dar',
  tone TEXT DEFAULT 'friendly',
  currency TEXT DEFAULT 'MAD',
  plan TEXT DEFAULT 'free',
  ai_enabled INTEGER DEFAULT 1,
  default_carrier TEXT DEFAULT 'Amana',
  free_shipping_over REAL DEFAULT 0,
  wa_number TEXT DEFAULT '',
  tagline TEXT DEFAULT '',
  order_seq INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT DEFAULT '',
  pass_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price REAL NOT NULL,
  category TEXT DEFAULT '',
  emoji TEXT DEFAULT '',
  image TEXT DEFAULT '',
  keywords TEXT DEFAULT '',
  low_stock_alert INTEGER DEFAULT 3,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS variants (
  id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'Standard',
  color TEXT DEFAULT '',
  size TEXT DEFAULT '',
  stock INTEGER DEFAULT 0,
  price_override REAL
);
CREATE TABLE IF NOT EXISTS carriers (
  id INTEGER PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  base_price REAL DEFAULT 35,
  eta_days TEXT DEFAULT '2-3',
  enabled INTEGER DEFAULT 1,
  city_prices TEXT DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT DEFAULT '',
  city TEXT DEFAULT '',
  address TEXT DEFAULT '',
  orders_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  ltv REAL DEFAULT 0,
  last_order_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, phone)
);
CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_key TEXT NOT NULL,
  channel TEXT DEFAULT 'web',
  source_code TEXT DEFAULT '',
  customer_id INTEGER,
  customer_name TEXT DEFAULT '',
  state TEXT DEFAULT '{}',
  lang TEXT DEFAULT '',
  bot_paused INTEGER DEFAULT 0,
  needs_attention INTEGER DEFAULT 0,
  attention_reason TEXT DEFAULT '',
  unread INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, customer_key)
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  text TEXT NOT NULL,
  quick TEXT DEFAULT '[]',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  customer_id INTEGER,
  conversation_id INTEGER,
  name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  city TEXT DEFAULT '',
  address TEXT DEFAULT '',
  status TEXT DEFAULT 'confirmed',
  shipment_status TEXT DEFAULT 'none',
  carrier TEXT DEFAULT '',
  tracking TEXT DEFAULT '',
  subtotal REAL DEFAULT 0,
  shipping_fee REAL DEFAULT 0,
  total REAL DEFAULT 0,
  channel TEXT DEFAULT 'web',
  source_code TEXT DEFAULT '',
  risk_level TEXT DEFAULT 'green',
  risk_score INTEGER DEFAULT 0,
  risk_reasons TEXT DEFAULT '[]',
  notes TEXT DEFAULT '',
  cod_remitted INTEGER DEFAULT 0,
  delivered_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, number)
);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER,
  variant_id INTEGER,
  name TEXT,
  label TEXT,
  qty INTEGER,
  price REAL
);
CREATE TABLE IF NOT EXISTS shipment_events (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT,
  note TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  order_id INTEGER,
  rating INTEGER NOT NULL,
  comment TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS post_links (
  id INTEGER PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  label TEXT DEFAULT '',
  channel TEXT DEFAULT 'instagram',
  product_id INTEGER,
  visits INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS wa_sessions (
  phone TEXT PRIMARY KEY,
  shop_id INTEGER NOT NULL,
  source_code TEXT DEFAULT '',
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS phone_rep (
  phone_hash TEXT NOT NULL,
  shop_id INTEGER NOT NULL,
  delivered INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  PRIMARY KEY (phone_hash, shop_id)
);
CREATE INDEX IF NOT EXISTS idx_orders_shop ON orders(shop_id, created_at);
CREATE INDEX IF NOT EXISTS idx_msgs_conv ON messages(conversation_id, id);
CREATE INDEX IF NOT EXISTS idx_products_shop ON products(shop_id);
`);

// ---- light migrations for databases created by earlier versions ----
function ensureColumn(table, col, def) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  if (!cols.includes(col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
}
ensureColumn('shops', 'auto_carrier', 'INTEGER DEFAULT 0');
ensureColumn('shops', 'theme_color', "TEXT DEFAULT ''");
ensureColumn('shops', 'announcement', "TEXT DEFAULT ''");
ensureColumn('shops', 'welcome_msg', "TEXT DEFAULT ''");
ensureColumn('shops', 'design', "TEXT DEFAULT ''");
ensureColumn('shops', 'trial_ends_at', "TEXT DEFAULT ''");
db.exec(`CREATE TABLE IF NOT EXISTS assistant_log (
  id INTEGER PRIMARY KEY,
  shop_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  label TEXT DEFAULT '',
  before TEXT DEFAULT '{}',
  undone INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);`);

// ---- tiny helpers -------------------------------------------------------
const all = (sql, ...p) => db.prepare(sql).all(...p).map(r => ({ ...r }));
const get = (sql, ...p) => { const r = db.prepare(sql).get(...p); return r ? { ...r } : null; };
const run = (sql, ...p) => db.prepare(sql).run(...p);
function tx(fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { try { db.exec('ROLLBACK'); } catch (_) {} throw e; }
}
const now = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

module.exports = { db, all, get, run, tx, now, DATA_DIR };
