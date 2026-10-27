CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  advertisement TEXT NOT NULL CHECK (advertisement ~ '^https?://'),
  advertisement_public_id TEXT,
  apply_link TEXT NOT NULL CHECK (apply_link ~ '^https?://'),
  sample BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS jobs_created_at_idx ON jobs (created_at DESC, id DESC);
