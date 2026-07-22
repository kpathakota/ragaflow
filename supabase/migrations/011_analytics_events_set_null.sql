-- Account deletion prerequisite: anonymize analytics events instead of blocking.
-- The rasika_id FK from 009 has no ON DELETE clause (RESTRICT default), so
-- auth.admin.deleteUser() fails for any rasika who ever fired an authenticated
-- analytics event. ON DELETE SET NULL turns their events into anonymous rows
-- (rasika_id = null already means "anonymous visit"), keeping DAU/error metrics
-- intact while removing the personal identifier.
-- See docs/account-deletion-design.md.
--
-- Idempotent: drops whatever FK exists on rasika_id by dynamic lookup (name-
-- agnostic), then re-adds it — safe to re-run, and matches uploads/sync.sql.

DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    WHERE con.conrelid = 'public.analytics_events'::regclass
      AND con.contype = 'f'
      AND EXISTS (
        SELECT 1 FROM pg_attribute a
        WHERE a.attrelid = con.conrelid
          AND a.attnum = ANY (con.conkey)
          AND a.attname = 'rasika_id'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.analytics_events DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE analytics_events
  ADD CONSTRAINT analytics_events_rasika_id_fkey
  FOREIGN KEY (rasika_id) REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN analytics_events.rasika_id IS 'Set when user is authenticated. Null for anonymous visits, or nulled when the account is deleted (events are anonymized, not deleted). Allows stitching anonymous → authenticated.';
