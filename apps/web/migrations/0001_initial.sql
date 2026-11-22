-- ListLift D1 Initial Schema (PRD Section 10)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free',
  locale TEXT NOT NULL DEFAULT 'en',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscriptions (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  period_end TEXT
);

CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  anon_id TEXT,
  input_json TEXT NOT NULL,
  marketplace TEXT NOT NULL,
  output_json TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  share_slug TEXT UNIQUE,
  is_public INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_listings_user ON listings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_share ON listings(share_slug);

CREATE TABLE IF NOT EXISTS research_packs (
  id TEXT PRIMARY KEY,
  key_hash TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  marketplace TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  data_json TEXT NOT NULL,
  sources_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS usage_counters (
  subject TEXT NOT NULL,
  day TEXT NOT NULL,
  tool TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (subject, day, tool)
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  props_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
