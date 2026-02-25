ALTER TABLE listening_sessions
  ADD COLUMN intended_duration_seconds integer,
  ADD COLUMN completed boolean;
