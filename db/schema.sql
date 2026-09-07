-- Altarious Global — Cloudflare D1 schema
-- Apply: npx wrangler d1 execute altarious --remote --file=db/schema.sql

CREATE TABLE IF NOT EXISTS inquiries (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  full_name     TEXT    NOT NULL,
  company       TEXT    NOT NULL,
  email         TEXT    NOT NULL,
  phone         TEXT    NOT NULL,
  service_interest      TEXT NOT NULL,
  vertical_interest     TEXT NOT NULL,
  sub_vertical_interest TEXT,
  message       TEXT    NOT NULL,
  source_page   TEXT,
  source_url    TEXT,
  page_title    TEXT,
  vertical      TEXT,
  sub_vertical  TEXT,
  product       TEXT,
  status        TEXT    NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','closed')),
  notes         TEXT,
  ip            TEXT,
  user_agent    TEXT,
  country       TEXT,
  updated_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_inquiries_created ON inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_status  ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_vertical ON inquiries(vertical);

-- CMS store: one row per content entity. `json` holds the same shape as content/*.json files.
CREATE TABLE IF NOT EXISTS content (
  kind        TEXT NOT NULL CHECK (kind IN ('site','vertical','sub-vertical','product','article','page','settings')),
  slug        TEXT NOT NULL,
  json        TEXT NOT NULL,
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_by  TEXT,
  PRIMARY KEY (kind, slug)
);

-- Key/value metadata (last publish time, etc.)
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- Reserved for future client/agent login areas (PRD §24). Not used by the public site.
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL UNIQUE,
  role       TEXT NOT NULL CHECK (role IN ('admin','editor','client','agent')),
  pass_hash  TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Media library for images used in articles and featured images.
-- Stored as base64 in D1 (images are resized client-side in the admin before upload).
CREATE TABLE IF NOT EXISTS media (
  id         TEXT PRIMARY KEY,
  filename   TEXT NOT NULL,
  mime       TEXT NOT NULL,
  bytes      INTEGER NOT NULL,
  width      INTEGER,
  height     INTEGER,
  alt        TEXT,
  data       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  created_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_media_created ON media(created_at DESC);
