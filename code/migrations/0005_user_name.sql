ALTER TABLE users ADD COLUMN name TEXT CHECK (name IS NULL OR length(trim(name)) BETWEEN 1 AND 100);
