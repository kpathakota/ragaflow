#!/usr/bin/env bash
#
# Ragaflow billing integration test (Polar sandbox)
#
# Tier 1 (default): Tests checkout redirect, profile display for each
#   subscription state, portal redirect, and cleanup. Seeds status directly
#   via Supabase RPC — no Polar checkout UI interaction needed.
#
# Tier 2 (--full): Also attempts real card fill on Polar checkout page,
#   waits for webhook to update Supabase. Requires `polar listen` running.
#
# Prerequisites:
#   npm install -g agent-browser && agent-browser install
#   Dev server running: cd web && npm run dev
#   For --full mode: polar listen http://localhost:3000/api/webhooks/polar
#
# Required env vars in web/.env.local:
#   TEST_EMAIL, TEST_PASSWORD, TEST_USER_ID,
#   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY
#
# Usage:
#   ./tests/integration/billing-test.sh [base_url] [--full]
#
set -uo pipefail

# --- Parse args ---
BASE_URL="http://localhost:3000"
FULL_MODE=false
for arg in "$@"; do
  case "$arg" in
    --full) FULL_MODE=true ;;
    *) BASE_URL="$arg" ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SS_DIR="$SCRIPT_DIR/screenshots"
mkdir -p "$SS_DIR"
PASS=0
FAIL=0

# --- Load env vars from web/.env.local ---
ENV_FILE="$SCRIPT_DIR/../../web/.env.local"
if [[ -f "$ENV_FILE" ]]; then
  TEST_EMAIL=$(grep '^TEST_EMAIL=' "$ENV_FILE" | cut -d= -f2)
  TEST_PASSWORD=$(grep '^TEST_PASSWORD=' "$ENV_FILE" | cut -d= -f2)
  TEST_USER_ID=$(grep '^TEST_USER_ID=' "$ENV_FILE" | cut -d= -f2)
  SUPABASE_SECRET_KEY=$(grep '^SUPABASE_SECRET_KEY=' "$ENV_FILE" | cut -d= -f2)
  SUPABASE_URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' "$ENV_FILE" | cut -d= -f2)
fi
TEST_EMAIL="${TEST_EMAIL:?Set TEST_EMAIL in web/.env.local}"
TEST_PASSWORD="${TEST_PASSWORD:?Set TEST_PASSWORD in web/.env.local}"
TEST_USER_ID="${TEST_USER_ID:?Set TEST_USER_ID in web/.env.local}"
SUPABASE_SECRET_KEY="${SUPABASE_SECRET_KEY:?Set SUPABASE_SECRET_KEY in web/.env.local}"
SUPABASE_URL="${SUPABASE_URL:?Set NEXT_PUBLIC_SUPABASE_URL in web/.env.local}"

# --- Helpers ---
ab() { agent-browser "$@"; }

log()  { echo -e "\n\033[1;34m▸ $1\033[0m"; }
pass() { echo -e "  \033[1;32m✓ $1\033[0m"; PASS=$((PASS + 1)); }
fail() { echo -e "  \033[1;31m✗ $1\033[0m"; FAIL=$((FAIL + 1)); }

ref_from() { echo "$1" | grep -oE 'ref=e[0-9]+' | head -1 | sed 's/ref=/@/'; }

# Full snapshot (includes all text content, not just interactive elements)
take_snapshot() { ab snapshot 2>/dev/null || true; }

# Interactive snapshot (refs for clickable elements)
take_snapshot_i() { ab snapshot -i 2>/dev/null || true; }

wait_for_text() {
  local text="$1" retries="${2:-10}"
  for _ in $(seq 1 "$retries"); do
    if take_snapshot | grep -qi "$text"; then return 0; fi
    sleep 1
  done
  return 1
}

scroll_to_bottom() { ab eval 'window.scrollTo(0, document.body.scrollHeight)' 2>/dev/null || true; }

set_subscription_status() {
  local status="$1"
  curl -s -X POST \
    -H "apikey: $SUPABASE_SECRET_KEY" \
    -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
    -H "Content-Type: application/json" \
    "${SUPABASE_URL}/rest/v1/rpc/update_rasika_subscription" \
    -d "{\"p_rasika_id\": \"$TEST_USER_ID\", \"p_polar_customer_id\": \"test-billing-integration\", \"p_subscription_status\": \"$status\"}" \
    > /dev/null
}

get_subscription_status() {
  curl -s \
    -H "apikey: $SUPABASE_SECRET_KEY" \
    -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
    "${SUPABASE_URL}/rest/v1/rasikas?select=subscription_status&rasika_id=eq.${TEST_USER_ID}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)[0].get('subscription_status',''))" 2>/dev/null || echo ""
}

cleanup() { ab close 2>/dev/null || true; }
trap cleanup EXIT

# --- Prerequisite checks ---
echo "================================================"
echo "  Ragaflow Billing Integration Test"
echo "  Target: $BASE_URL"
echo "  Mode:   $(if $FULL_MODE; then echo 'FULL (real checkout)'; else echo 'Tier 1 (seeded states)'; fi)"
echo "================================================"

if ! command -v agent-browser &>/dev/null; then
  echo "ERROR: agent-browser not installed. Run: npm install -g agent-browser && agent-browser install"
  exit 1
fi

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" != "200" ]]; then
  echo "ERROR: Dev server not responding at $BASE_URL (HTTP $HTTP_CODE)"
  echo "Run: cd web && npm run dev"
  exit 1
fi

if $FULL_MODE; then
  if ! pgrep -f "polar listen" > /dev/null 2>&1; then
    echo "ERROR: --full mode requires 'polar listen' running in another terminal"
    echo "Run: polar listen http://localhost:3000/api/webhooks/polar"
    exit 1
  fi
fi

# ------------------------------------------------------------------
# 1. SIGN IN
# ------------------------------------------------------------------
log "1. Sign in with test account"

ab open "$BASE_URL/auth"
sleep 1

# Set mobile viewport (iPhone 14 Pro: 393×852)
ab set viewport 393 852
sleep 1

SNAP=$(take_snapshot_i)
EMAIL_LINE=$(echo "$SNAP" | grep -i 'textbox.*Email' | head -1)
PASS_LINE=$(echo "$SNAP" | grep -i 'textbox.*Password' | head -1)
SUBMIT_LINE=$(echo "$SNAP" | grep -i 'button.*"Sign in"' | head -1)

EMAIL_REF=$(ref_from "$EMAIL_LINE")
PASS_REF=$(ref_from "$PASS_LINE")
SUBMIT_REF=$(ref_from "$SUBMIT_LINE")

if [[ -n "$EMAIL_REF" && -n "$PASS_REF" && -n "$SUBMIT_REF" ]]; then
  ab fill "$EMAIL_REF" "$TEST_EMAIL"
  ab fill "$PASS_REF" "$TEST_PASSWORD"
  ab click "$SUBMIT_REF"
else
  fail "Could not find auth form elements"
  exit 1
fi

sleep 3

if wait_for_text "Ragaflow" 10; then
  pass "Signed in — redirected to homepage"
else
  fail "Sign-in did not redirect to homepage"
fi

# Visit profile to ensure rasika row exists (ensureRasika triggers on first visit)
ab open "$BASE_URL/profile"
sleep 3

# Verify Supabase RPC works (rasika row must exist after sign-in)
STATUS=$(get_subscription_status)
if [[ -z "$STATUS" ]]; then
  echo "ERROR: Could not query subscription_status for TEST_USER_ID=$TEST_USER_ID"
  echo "The test user may not have a rasika row. Check TEST_USER_ID in web/.env.local"
  exit 1
fi

# ------------------------------------------------------------------
# 2. VERIFY FREE STATE
# ------------------------------------------------------------------
log "2. Verify free subscription state"

set_subscription_status "free"
sleep 1

ab open "$BASE_URL/profile"
sleep 3

SNAP=$(take_snapshot)
if echo "$SNAP" | grep -qi "Go Premium"; then
  pass "Free state: 'Go Premium' card visible"
else
  fail "Free state: 'Go Premium' card not found"
fi

if echo "$SNAP" | grep -qi "Subscribe"; then
  pass "Free state: 'Subscribe' link visible"
else
  fail "Free state: 'Subscribe' link not found"
fi

scroll_to_bottom
sleep 1
ab screenshot "$SS_DIR/billing-01-free-profile.png"

# ------------------------------------------------------------------
# 3. TEST CHECKOUT REDIRECT
# ------------------------------------------------------------------
log "3. Test checkout redirect to Polar"

# Navigate directly to /api/checkout (ab click doesn't follow server-side redirects)
ab open "$BASE_URL/api/checkout"
sleep 5

CURRENT_URL=$(ab eval 'window.location.href' 2>/dev/null || echo "")
if echo "$CURRENT_URL" | grep -qi "polar.sh"; then
  pass "Checkout redirected to Polar"
else
  fail "Checkout did not redirect to Polar (URL: $CURRENT_URL)"
fi

ab screenshot "$SS_DIR/billing-02-polar-checkout.png"

# ------------------------------------------------------------------
# 4. FULL CHECKOUT (--full mode only)
# ------------------------------------------------------------------
if $FULL_MODE; then
  log "4. Complete Polar checkout (full e2e)"

  # Take annotated snapshot for debugging
  ab screenshot "$SS_DIR/billing-03-checkout-annotated.png" --annotate

  SNAP=$(take_snapshot_i)

  # Look for card fields (Stripe iframes may or may not appear)
  CARD_LINE=$(echo "$SNAP" | grep -iE 'textbox.*(card|number)' | head -1)
  CARD_REF=$(ref_from "$CARD_LINE")

  EXP_LINE=$(echo "$SNAP" | grep -iE 'textbox.*(expir|exp)' | head -1)
  EXP_REF=$(ref_from "$EXP_LINE")

  CVC_LINE=$(echo "$SNAP" | grep -iE 'textbox.*(cvc|cvv|security)' | head -1)
  CVC_REF=$(ref_from "$CVC_LINE")

  if [[ -n "$CARD_REF" && -n "$EXP_REF" && -n "$CVC_REF" ]]; then
    ab fill "$CARD_REF" "4242424242424242"
    sleep 0.5
    ab fill "$EXP_REF" "1229"
    sleep 0.5
    ab fill "$CVC_REF" "123"
    sleep 1

    # Find and click Pay/Subscribe button
    SNAP=$(take_snapshot_i)
    PAY_LINE=$(echo "$SNAP" | grep -iE 'button.*(Pay|Subscribe|Continue|Checkout|Submit)' | head -1)
    PAY_REF=$(ref_from "$PAY_LINE")

    if [[ -n "$PAY_REF" ]]; then
      ab click "$PAY_REF"
      pass "Submitted payment on Polar checkout"

      # Wait for redirect back to profile
      log "   Waiting for redirect back to profile..."
      REDIRECTED=false
      for i in $(seq 1 30); do
        CURRENT_URL=$(ab eval 'window.location.href' 2>/dev/null || echo "")
        if echo "$CURRENT_URL" | grep -q "profile.*checkout=success"; then
          REDIRECTED=true
          break
        fi
        sleep 1
      done

      if $REDIRECTED; then
        pass "Redirected to /profile?checkout=success"

        # Verify success banner
        SNAP=$(take_snapshot)
        if echo "$SNAP" | grep -qi "Payment received\|plan will update"; then
          pass "Checkout success banner displayed"
        else
          fail "Checkout success banner not found"
        fi
      else
        fail "Did not redirect back to profile within 30s"
      fi

      # Poll for webhook delivery
      log "   Polling subscription_status for webhook delivery..."
      WEBHOOK_DELIVERED=false
      for i in $(seq 1 30); do
        STATUS=$(get_subscription_status)
        if [[ "$STATUS" == "active" || "$STATUS" == "lifetime" ]]; then
          WEBHOOK_DELIVERED=true
          break
        fi
        sleep 1
      done

      if $WEBHOOK_DELIVERED; then
        pass "Webhook delivered — subscription_status=$STATUS"
      else
        fail "Webhook not delivered within 30s (status still '$STATUS')"
      fi

      ab screenshot "$SS_DIR/billing-04-post-checkout.png"
    else
      fail "Pay button not found on Polar checkout"
    fi
  else
    fail "Card input fields not accessible in snapshot (Stripe iframe limitation)"
    echo "       Card ref: $CARD_REF | Exp ref: $EXP_REF | CVC ref: $CVC_REF"
    echo "       Check billing-03-checkout-annotated.png for available elements"
  fi
else
  log "4. Skipping full checkout (use --full to enable)"
fi

# ------------------------------------------------------------------
# 5. VERIFY ACTIVE STATE
# ------------------------------------------------------------------
log "5. Verify active subscription state"

set_subscription_status "active"
sleep 1

ab open "$BASE_URL/profile"
sleep 3

SNAP=$(take_snapshot)
if echo "$SNAP" | grep -qi "Premium"; then
  pass "Active state: 'Premium' card visible"
else
  fail "Active state: 'Premium' card not found"
fi

if echo "$SNAP" | grep -qi "All tracks unlocked"; then
  pass "Active state: 'All tracks unlocked' text visible"
else
  fail "Active state: 'All tracks unlocked' text not found"
fi

if echo "$SNAP" | grep -qi "Manage subscription"; then
  pass "Active state: 'Manage subscription' link visible"
else
  fail "Active state: 'Manage subscription' link not found"
fi

scroll_to_bottom
sleep 1
ab screenshot "$SS_DIR/billing-05-active-profile.png"

# ------------------------------------------------------------------
# 6. VERIFY LIFETIME STATE
# ------------------------------------------------------------------
log "6. Verify lifetime subscription state"

set_subscription_status "lifetime"
sleep 1

ab open "$BASE_URL/profile"
sleep 3

SNAP=$(take_snapshot)
if echo "$SNAP" | grep -qi "Lifetime"; then
  pass "Lifetime state: 'Lifetime' card visible"
else
  fail "Lifetime state: 'Lifetime' card not found"
fi

if echo "$SNAP" | grep -qi "lifetime access"; then
  pass "Lifetime state: 'lifetime access' text visible"
else
  fail "Lifetime state: 'lifetime access' text not found"
fi

# Manage subscription should NOT appear for lifetime
if echo "$SNAP" | grep -qi "Manage subscription"; then
  fail "Lifetime state: 'Manage subscription' link should NOT appear"
else
  pass "Lifetime state: no 'Manage subscription' link (correct)"
fi

scroll_to_bottom
sleep 1
ab screenshot "$SS_DIR/billing-06-lifetime-profile.png"

# ------------------------------------------------------------------
# 7. VERIFY CANCELED STATE
# ------------------------------------------------------------------
log "7. Verify canceled subscription state"

set_subscription_status "canceled"
sleep 1

ab open "$BASE_URL/profile"
sleep 3

SNAP=$(take_snapshot)
if echo "$SNAP" | grep -qi "Premium"; then
  pass "Canceled state: 'Premium' card visible"
else
  fail "Canceled state: 'Premium' card not found"
fi

if echo "$SNAP" | grep -qi "billing period ends"; then
  pass "Canceled state: 'billing period ends' text visible"
else
  fail "Canceled state: 'billing period ends' text not found"
fi

if echo "$SNAP" | grep -qi "Manage subscription"; then
  pass "Canceled state: 'Manage subscription' link visible"
else
  fail "Canceled state: 'Manage subscription' link not found"
fi

scroll_to_bottom
sleep 1
ab screenshot "$SS_DIR/billing-07-canceled-profile.png"

# ------------------------------------------------------------------
# 8. VERIFY PAST_DUE STATE
# ------------------------------------------------------------------
log "8. Verify past_due subscription state"

set_subscription_status "past_due"
sleep 1

ab open "$BASE_URL/profile"
sleep 3

SNAP=$(take_snapshot)
if echo "$SNAP" | grep -qi "Premium"; then
  pass "Past due state: 'Premium' card visible"
else
  fail "Past due state: 'Premium' card not found"
fi

if echo "$SNAP" | grep -qi "Payment failed"; then
  pass "Past due state: 'Payment failed' text visible"
else
  fail "Past due state: 'Payment failed' text not found"
fi

scroll_to_bottom
sleep 1
ab screenshot "$SS_DIR/billing-08-past-due-profile.png"

# ------------------------------------------------------------------
# 9. VERIFY PORTAL REDIRECT
# ------------------------------------------------------------------
log "9. Verify portal redirect"

set_subscription_status "active"
sleep 1

ab open "$BASE_URL/profile"
sleep 3

# Verify Manage subscription link exists
SNAP=$(take_snapshot)
if echo "$SNAP" | grep -qi "Manage subscription"; then
  pass "Portal: 'Manage subscription' link present"
else
  fail "Portal: 'Manage subscription' link not found"
fi

# Verify the link href points to /api/portal
SNAP_I=$(take_snapshot_i)
PORTAL_LINE=$(echo "$SNAP_I" | grep -i 'link.*Manage subscription' | head -1)
PORTAL_REF=$(ref_from "$PORTAL_LINE")

if [[ -n "$PORTAL_REF" ]]; then
  PORTAL_HREF=$(ab eval 'document.querySelector("a[href*=portal]")?.getAttribute("href")' 2>/dev/null || echo "")
  if echo "$PORTAL_HREF" | grep -qi "portal"; then
    pass "Portal: link points to /api/portal"
  else
    fail "Portal: link href does not contain 'portal'"
  fi
else
  fail "Portal: 'Manage subscription' link ref not found"
fi

# Note: actual Polar redirect only works with a real polar_customer_id
# from a real checkout — seeded test IDs will fail. Full e2e portal
# testing requires --full mode with a real sandbox transaction.
ab screenshot "$SS_DIR/billing-09-portal.png"

# ------------------------------------------------------------------
# 10. CLEANUP
# ------------------------------------------------------------------
log "10. Cleanup — reset to free"

set_subscription_status "free"
sleep 1

STATUS=$(get_subscription_status)
if [[ "$STATUS" == "free" ]]; then
  pass "subscription_status reset to 'free'"
else
  fail "Failed to reset subscription_status (still '$STATUS')"
fi

# Navigate back to app so browser isn't stuck on Polar domain
ab open "$BASE_URL" 2>/dev/null || true

# ------------------------------------------------------------------
# RESULTS
# ------------------------------------------------------------------
echo ""
echo "================================================"
echo "  Results: $PASS passed, $FAIL failed"
echo "  Screenshots saved to: $SS_DIR/"
echo "================================================"
ls -1 "$SS_DIR"/billing-*.png 2>/dev/null | while read -r f; do echo "  $(basename "$f")"; done
echo ""

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
