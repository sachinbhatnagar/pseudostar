CREATE TABLE shared_problems (
  id TEXT PRIMARY KEY,
  source_key TEXT NOT NULL UNIQUE,
  owner TEXT NOT NULL REFERENCES users(id),
  source TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','generating','failed','review','rejected','published')),
  candidate TEXT,
  validation TEXT,
  published TEXT,
  reference TEXT,
  error TEXT,
  attempt TEXT,
  lease_until INTEGER,
  updated_at INTEGER NOT NULL
);
CREATE INDEX shared_problems_owner ON shared_problems(owner, updated_at);
CREATE TABLE problem_reviews (
  id TEXT PRIMARY KEY,
  problem_id TEXT NOT NULL REFERENCES shared_problems(id),
  reviewer TEXT NOT NULL REFERENCES users(id),
  revision INTEGER NOT NULL,
  action TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
