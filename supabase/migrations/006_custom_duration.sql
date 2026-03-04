-- Add custom_duration column to rasika_preferences
-- Stores the rasika's custom timer duration in minutes (1–120), nullable

ALTER TABLE rasika_preferences
  ADD COLUMN custom_duration integer;
