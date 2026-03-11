-- Rename rasika_preferences → rasikas
ALTER TABLE rasika_preferences RENAME TO rasikas;

-- Drop old RLS policy and recreate with new table name
DROP POLICY "rasikas manage own preferences" ON rasikas;

CREATE POLICY "rasikas manage own record"
  ON rasikas FOR ALL
  TO authenticated
  USING (auth.uid() = rasika_id)
  WITH CHECK (auth.uid() = rasika_id);

-- Add subscription columns
ALTER TABLE rasikas ADD COLUMN subscription_status text NOT NULL DEFAULT 'free';
ALTER TABLE rasikas ADD COLUMN polar_customer_id text;
