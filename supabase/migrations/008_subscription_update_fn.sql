-- Scoped SECURITY DEFINER function for updating rasika subscription status.
-- Only callable by service_role — defense in depth for the webhook handler.
-- Even if the secret key leaks, this limits what can be written.

CREATE OR REPLACE FUNCTION update_rasika_subscription(
  p_rasika_id uuid,
  p_polar_customer_id text,
  p_subscription_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate status against known values
  IF p_subscription_status NOT IN ('free', 'active', 'canceled', 'expired', 'past_due', 'lifetime') THEN
    RAISE EXCEPTION 'Invalid subscription_status: %', p_subscription_status;
  END IF;

  UPDATE rasikas
  SET subscription_status = p_subscription_status,
      polar_customer_id   = p_polar_customer_id
  WHERE rasika_id = p_rasika_id;
END;
$$;

-- Lock down: only service_role can call this function
REVOKE EXECUTE ON FUNCTION update_rasika_subscription(uuid, text, text) FROM public;
REVOKE EXECUTE ON FUNCTION update_rasika_subscription(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION update_rasika_subscription(uuid, text, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION update_rasika_subscription(uuid, text, text) TO service_role;
