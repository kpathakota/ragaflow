-- Analytics events table for tracking usage, errors, and engagement
-- Shared by web and iOS — both platforms write the same event types

CREATE TABLE analytics_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  anonymous_id uuid NOT NULL,
  rasika_id uuid REFERENCES auth.users(id),
  event_type text NOT NULL CHECK (event_type IN ('app_open', 'scenario_view', 'auth_error', 'playback_error')),
  platform text NOT NULL CHECK (platform IN ('web', 'ios')),
  metadata jsonb DEFAULT '{}' CHECK (pg_column_size(metadata) < 4096),
  created_at timestamptz DEFAULT now()
);

-- Index for DAU/WAU queries (distinct anonymous_id or rasika_id by date)
CREATE INDEX idx_analytics_events_created_at ON analytics_events (created_at);
CREATE INDEX idx_analytics_events_type ON analytics_events (event_type, created_at);
CREATE INDEX idx_analytics_events_rasika ON analytics_events (rasika_id, created_at)
  WHERE rasika_id IS NOT NULL;

-- RLS: anyone can insert (anonymous users too), authenticated users can read their own
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analytics events"
  ON analytics_events FOR INSERT
  WITH CHECK (rasika_id IS NULL OR rasika_id = auth.uid());

CREATE POLICY "Authenticated users can read own events"
  ON analytics_events FOR SELECT
  USING (auth.uid() = rasika_id);

-- Comment documenting the event contract for web + iOS parity
COMMENT ON TABLE analytics_events IS 'Analytics event log shared by web and iOS. Event types: app_open, scenario_view, auth_error, playback_error.';
COMMENT ON COLUMN analytics_events.anonymous_id IS 'UUID generated per app session (tab/app launch). Always present. Enables visitor counting without auth.';
COMMENT ON COLUMN analytics_events.rasika_id IS 'Set when user is authenticated. Null for anonymous visits. Allows stitching anonymous → authenticated.';
COMMENT ON COLUMN analytics_events.platform IS 'web or ios — required for filtering.';
COMMENT ON COLUMN analytics_events.metadata IS 'JSON payload — shape depends on event_type. See supabase/analytics-queries.sql for documentation.';
