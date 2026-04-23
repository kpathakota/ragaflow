#!/bin/sh
# ci_post_clone.sh — Xcode Cloud runs this after cloning the repo.
# Injects Supabase secrets from Xcode Cloud environment variables
# into xcconfig files that Info.plist reads at build time.
#
# In App Store Connect → Xcode Cloud → Workflow → Environment Variables, set:
#   SUPABASE_URL              (production Supabase URL)
#   SUPABASE_PUBLISHABLE_KEY  (production publishable key)

set -e

CONFIG_DIR="$CI_PRIMARY_REPOSITORY_PATH/ios/Ragaflow/Configuration"

# xcconfig treats // as a comment — replace :// with :/$$()/ to escape it
ESCAPED_URL=$(echo "$SUPABASE_URL" | sed 's|://|:/$()/|')

echo "Writing Release.xcconfig with Supabase secrets..."
cat > "$CONFIG_DIR/Release.xcconfig" <<EOF
// xcconfig: use \$() to break // so it's not treated as a comment
SUPABASE_URL = ${ESCAPED_URL}
SUPABASE_PUBLISHABLE_KEY = ${SUPABASE_PUBLISHABLE_KEY}
EOF

# Note: CI builds use production values for both configs since
# Xcode Cloud archives are distributed to TestFlight (production).
# Local debug builds use staging values from manually created Debug.xcconfig.
echo "Writing Debug.xcconfig for CI builds..."
cat > "$CONFIG_DIR/Debug.xcconfig" <<EOF
// xcconfig: use \$() to break // so it's not treated as a comment
SUPABASE_URL = ${ESCAPED_URL}
SUPABASE_PUBLISHABLE_KEY = ${SUPABASE_PUBLISHABLE_KEY}
EOF

echo "Secrets injected successfully."
