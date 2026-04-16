-- ============================================================
-- Ragaflow Analytics — Ad-hoc SQL Queries
-- Run these in the Supabase SQL editor to check metrics.
-- ============================================================

-- ============================================================
-- EVENT TYPE CONTRACT (web + iOS must both follow this)
-- ============================================================
--
-- app_open      — fires on app/tab load
--                 metadata: {}
--
-- scenario_view — fires when user views a scenario track list
--                 metadata: { "scenario": "focus"|"sleep"|"meditate" }
--
-- auth_error    — fires on sign-in/sign-up failure
--                 metadata: { "method": "sign_in"|"sign_up", "error": "..." }
--
-- playback_error — fires when audio fails to load/play
--                  metadata: { "track_id": "uuid", "error": "..." }
--

-- ============================================================
-- 1. DAU (Daily Active Users) — last 30 days
-- ============================================================
SELECT
  created_at::date AS day,
  COUNT(DISTINCT anonymous_id) AS unique_visitors,
  COUNT(DISTINCT rasika_id) FILTER (WHERE rasika_id IS NOT NULL) AS signed_in_users
FROM analytics_events
WHERE event_type = 'app_open'
  AND created_at >= now() - interval '30 days'
GROUP BY day
ORDER BY day DESC;

-- ============================================================
-- 2. WAU (Weekly Active Users) — last 12 weeks
-- ============================================================
SELECT
  date_trunc('week', created_at)::date AS week_start,
  COUNT(DISTINCT anonymous_id) AS unique_visitors,
  COUNT(DISTINCT rasika_id) FILTER (WHERE rasika_id IS NOT NULL) AS signed_in_users
FROM analytics_events
WHERE event_type = 'app_open'
  AND created_at >= now() - interval '12 weeks'
GROUP BY week_start
ORDER BY week_start DESC;

-- ============================================================
-- 3. Browse Without Play — users who viewed scenarios but
--    didn't start a listening session that day
-- ============================================================
SELECT
  sv.day,
  COUNT(DISTINCT sv.anonymous_id) AS browsers,
  COUNT(DISTINCT ls.rasika_id) AS players,
  COUNT(DISTINCT sv.anonymous_id) - COUNT(DISTINCT ls.rasika_id) AS browse_only
FROM (
  SELECT anonymous_id, rasika_id, created_at::date AS day
  FROM analytics_events
  WHERE event_type = 'scenario_view'
    AND created_at >= now() - interval '30 days'
) sv
LEFT JOIN listening_sessions ls
  ON sv.rasika_id = ls.rasika_id
  AND sv.day = ls.started_at::date
GROUP BY sv.day
ORDER BY sv.day DESC;

-- ============================================================
-- 4. Session Completion Rate — last 30 days
-- ============================================================
SELECT
  started_at::date AS day,
  COUNT(*) AS total_sessions,
  COUNT(*) FILTER (WHERE completed = true) AS completed,
  COUNT(*) FILTER (WHERE completed = false) AS abandoned,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE completed = true) / NULLIF(COUNT(*), 0),
    1
  ) AS completion_pct
FROM listening_sessions
WHERE started_at >= now() - interval '30 days'
GROUP BY day
ORDER BY day DESC;

-- ============================================================
-- 5. Short Sessions (under 2 minutes) — last 30 days
-- ============================================================
SELECT
  started_at::date AS day,
  COUNT(*) AS total_sessions,
  COUNT(*) FILTER (WHERE duration_seconds < 120) AS short_sessions,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE duration_seconds < 120) / NULLIF(COUNT(*), 0),
    1
  ) AS short_pct
FROM listening_sessions
WHERE started_at >= now() - interval '30 days'
  AND duration_seconds IS NOT NULL
GROUP BY day
ORDER BY day DESC;

-- ============================================================
-- 6. Auth Errors — last 30 days
-- ============================================================
SELECT
  created_at::date AS day,
  metadata->>'method' AS method,
  metadata->>'error' AS error_message,
  COUNT(*) AS occurrences
FROM analytics_events
WHERE event_type = 'auth_error'
  AND created_at >= now() - interval '30 days'
GROUP BY day, method, error_message
ORDER BY day DESC, occurrences DESC;

-- ============================================================
-- 7. Playback Errors — last 30 days
-- ============================================================
SELECT
  created_at::date AS day,
  metadata->>'track_id' AS track_id,
  metadata->>'error' AS error_message,
  COUNT(*) AS occurrences
FROM analytics_events
WHERE event_type = 'playback_error'
  AND created_at >= now() - interval '30 days'
GROUP BY day, track_id, error_message
ORDER BY day DESC, occurrences DESC;

-- ============================================================
-- 8. Scenario Popularity — last 30 days
-- ============================================================
SELECT
  metadata->>'scenario' AS scenario,
  COUNT(*) AS views,
  COUNT(DISTINCT anonymous_id) AS unique_viewers
FROM analytics_events
WHERE event_type = 'scenario_view'
  AND created_at >= now() - interval '30 days'
GROUP BY scenario
ORDER BY views DESC;

-- ============================================================
-- 9. Platform Split — last 30 days
-- ============================================================
SELECT
  platform,
  COUNT(DISTINCT anonymous_id) AS unique_visitors,
  COUNT(*) AS total_events
FROM analytics_events
WHERE created_at >= now() - interval '30 days'
GROUP BY platform
ORDER BY total_events DESC;

-- ============================================================
-- 10. Error Rate Overview — last 7 days
-- ============================================================
SELECT
  event_type,
  COUNT(*) AS occurrences,
  COUNT(DISTINCT anonymous_id) AS affected_users
FROM analytics_events
WHERE event_type IN ('auth_error', 'playback_error')
  AND created_at >= now() - interval '7 days'
GROUP BY event_type;
