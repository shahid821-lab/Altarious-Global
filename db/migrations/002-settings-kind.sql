-- 002 — allow the 'settings' content kind.
-- SQLite cannot alter a CHECK constraint in place, so the table is rebuilt and the rows copied.
-- Safe to run more than once: it no-ops if the constraint already allows 'settings'.
-- Apply:  npx wrangler d1 execute altarious --remote --file=db/migrations/002-settings-kind.sql

PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS content_migrate_002 (
  kind        TEXT NOT NULL CHECK (kind IN ('site','vertical','sub-vertical','product','article','page','settings')),
  slug        TEXT NOT NULL,
  json        TEXT NOT NULL,
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_by  TEXT,
  PRIMARY KEY (kind, slug)
);

INSERT OR REPLACE INTO content_migrate_002 (kind, slug, json, updated_at, updated_by)
  SELECT kind, slug, json, updated_at, updated_by FROM content;

DROP TABLE content;

ALTER TABLE content_migrate_002 RENAME TO content;

PRAGMA foreign_keys = ON;
