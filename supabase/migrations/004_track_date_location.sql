ALTER TABLE tracks
  ADD COLUMN recorded_date date,
  ADD COLUMN location text,
  ALTER COLUMN title DROP NOT NULL;
