-- Add duration columns to rasika_preferences for default tracks
-- Stores the timer duration (in seconds) the rasika last used when setting a default

ALTER TABLE rasika_preferences
  ADD COLUMN default_focus_duration integer,
  ADD COLUMN default_sleep_duration integer,
  ADD COLUMN default_meditate_duration integer;
