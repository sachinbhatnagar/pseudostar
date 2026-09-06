-- Keep all existing programs. Rename older duplicates before adding the constraint.
UPDATE programs SET title = substr(trim(title), 1, 75) || ' (' || id || ')'
WHERE deleted_at IS NULL AND id IN (
  SELECT id FROM (
    SELECT id, row_number() OVER (
      PARTITION BY owner_id, lower(trim(title)) ORDER BY updated_at DESC, id
    ) AS duplicate_number FROM programs WHERE deleted_at IS NULL
  ) WHERE duplicate_number > 1
);
CREATE UNIQUE INDEX programs_unique_name ON programs(owner_id, lower(trim(title))) WHERE deleted_at IS NULL;
