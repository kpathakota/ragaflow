-- Webhook observability (PR #63 review): update_rasika_subscription now
-- returns the number of rasika rows updated. A zero-row update means the
-- webhook fired for a rasika that no longer exists — most likely the
-- checkout→webhook race: an account deleted between Polar checkout
-- completing (status still 'free', so the 409 guard passes) and the
-- subscription.active webhook arriving. The webhook handler logs loudly on
-- zero rows so the orphaned Polar subscription can be canceled by hand in
-- the Polar dashboard. See docs/account-deletion-design.md.
--
-- Safe ordering: existing deployed webhook code ignores the return value,
-- and the updated webhook code treats a null return (function not yet
-- migrated) as not-zero — no false alarms in either deploy order.

-- CREATE OR REPLACE cannot change a return type — drop and recreate.
DROP FUNCTION IF EXISTS update_rasika_subscription(uuid, text, text);

CREATE FUNCTION update_rasika_subscription(
  p_rasika_id uuid,
  p_polar_customer_id text,
  p_subscription_status text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows integer;
BEGIN
  -- Validate status against known values (unchanged from 008)
  IF p_subscription_status NOT IN ('free', 'active', 'canceled', 'expired', 'past_due', 'lifetime') THEN
    RAISE EXCEPTION 'Invalid subscription_status: %', p_subscription_status;
  END IF;

  UPDATE rasikas
  SET subscription_status = p_subscription_status,
      polar_customer_id   = p_polar_customer_id
  WHERE rasika_id = p_rasika_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

-- Re-apply the 008 lockdown — grants do not survive the drop.
REVOKE EXECUTE ON FUNCTION update_rasika_subscription(uuid, text, text) FROM public;
REVOKE EXECUTE ON FUNCTION update_rasika_subscription(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION update_rasika_subscription(uuid, text, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION update_rasika_subscription(uuid, text, text) TO service_role;
