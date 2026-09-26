CREATE TABLE english_profiles (
  owner_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  grade INTEGER NOT NULL CHECK (grade IN (8,9,10))
);
CREATE TABLE english_exercises (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX english_exercises_owner ON english_exercises(owner_id, created_at);
CREATE TABLE english_attempts (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  lease TEXT,
  lease_until INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX english_attempts_owner ON english_attempts(owner_id, created_at);
CREATE TABLE english_revisions (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL REFERENCES english_attempts(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  submitted_at INTEGER NOT NULL
);
CREATE INDEX english_revisions_attempt ON english_revisions(attempt_id, submitted_at);
CREATE TABLE english_awards (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  exercise_version INTEGER NOT NULL,
  attempt_id TEXT NOT NULL REFERENCES english_attempts(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('completion','revision')),
  points INTEGER NOT NULL,
  earned_at INTEGER NOT NULL,
  UNIQUE(owner_id, exercise_id, exercise_version, kind)
);
CREATE INDEX english_awards_owner ON english_awards(owner_id, earned_at);
