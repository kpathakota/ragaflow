#!/usr/bin/env bash
#
# Capture iOS screenshots for a PR — the simulator counterpart to web's
# scripts/screenshot.mjs. Runs the matching ScreenshotTests UI test(s), then
# extracts the XCTAttachment PNGs into an output directory with clean names.
#
# Usage:
#   ios/scripts/screenshot.sh --screen <name> --out <dir> [--device <udid-or-name>] [--sign-in]
#   ios/scripts/screenshot.sh --all --out /tmp/shots
#
# Screens: home, track-list, player (idle+running), explore, profile, all
#   --out <dir>     output directory (created if missing). Default: /tmp/ios-shots
#   --device <x>    simulator name or UDID. Default: first available iPhone.
#   --sign-in       sign in with the test account (needed for profile).
#
# Requires the Debug build to point at a populated Supabase (see CLAUDE.md).
set -euo pipefail

SCREEN=""
OUT="/tmp/ios-shots"
DEVICE=""
SIGN_IN="0"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --screen) SCREEN="$2"; shift 2 ;;
    --all)    SCREEN="all"; shift ;;
    --out)    OUT="$2"; shift 2 ;;
    --device) DEVICE="$2"; shift 2 ;;
    --sign-in) SIGN_IN="1"; shift ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$SCREEN" ]]; then
  echo "Error: pass --screen <name> or --all" >&2; exit 2
fi

# Map a screen name to its capture test method (bash 3.2 compatible — macOS
# ships no associative arrays).
test_method_for() {
  case "$1" in
    home)       echo testCaptureHome ;;
    track-list) echo testCaptureTrackList ;;
    player)     echo testCapturePlayer ;;
    explore)    echo testCaptureExplore ;;
    profile)    echo testCaptureProfile ;;
    *)          echo "" ;;
  esac
}

ALL_SCREENS="home track-list player explore profile"
if [[ "$SCREEN" == "all" ]]; then
  SCREENS=$ALL_SCREENS
else
  if [[ -z "$(test_method_for "$SCREEN")" ]]; then
    echo "Error: unknown screen '$SCREEN'. Valid: $ALL_SCREENS all" >&2; exit 2
  fi
  SCREENS="$SCREEN"
fi

# Resolve a destination. Prefer a booted device, else a named/first iPhone.
if [[ -z "$DEVICE" ]]; then
  DEVICE=$(xcrun simctl list devices booted | grep -oE '[0-9A-F-]{36}' | head -1 || true)
fi
if [[ -z "$DEVICE" ]]; then
  DEVICE=$(xcrun simctl list devices available | grep -oE 'iPhone[^(]*\(([0-9A-F-]{36})\)' | grep -oE '[0-9A-F-]{36}' | head -1 || true)
fi
if [[ -z "$DEVICE" ]]; then
  echo "Error: no iOS simulator found." >&2; exit 1
fi
DEST="id=$DEVICE"

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$OUT"

# The capture tests are gated behind SCREENSHOT_CAPTURE so they never run in the
# normal suite / CI. xcodebuild forwards env vars prefixed `TEST_RUNNER_` to the
# UI-test runner process (with the prefix stripped) — plain shell env does NOT
# reach the runner, so the prefix is required.
export TEST_RUNNER_SCREENSHOT_CAPTURE=1
if [[ "$SIGN_IN" == "1" ]]; then export TEST_RUNNER_SCREENSHOT_SIGN_IN=1; fi

for s in $SCREENS; do
  method="$(test_method_for "$s")"
  bundle="/tmp/ios-shot-$s.xcresult"
  rm -rf "$bundle"
  echo "→ capturing '$s' (RagaflowUITests/ScreenshotTests/$method)…"
  # Pass any env via the scheme's test action through xcodebuild's
  # -test-iterations is not needed; SCREENSHOT_SIGN_IN is read from the app's
  # process environment, set here via the launch environment.
  xcodebuild test \
    -project "$PROJECT_DIR/Ragaflow.xcodeproj" \
    -scheme Ragaflow \
    -destination "$DEST" \
    -only-testing:"RagaflowUITests/ScreenshotTests/$method" \
    -resultBundlePath "$bundle" \
    > "/tmp/ios-shot-$s.log" 2>&1 || { echo "  ✗ test failed — see /tmp/ios-shot-$s.log" >&2; tail -20 "/tmp/ios-shot-$s.log" >&2; exit 1; }

  # Extract attachments and rename via the manifest (attachment .name → file).
  tmp_extract="/tmp/ios-shot-$s-extract"
  rm -rf "$tmp_extract" && mkdir -p "$tmp_extract"
  xcrun xcresulttool export attachments --path "$bundle" --output-path "$tmp_extract" >/dev/null 2>&1
  python3 - "$tmp_extract" "$OUT" <<'PY'
import json, os, shutil, sys
extract, out = sys.argv[1], sys.argv[2]
manifest = json.load(open(os.path.join(extract, "manifest.json")))
for entry in manifest:
    for a in entry.get("attachments", []):
        src = a.get("exportedFileName")
        name = (a.get("suggestedHumanReadableName") or a.get("name") or "")
        # The attachment .name (e.g. "player-running") is the slug before the first "_".
        slug = name.split("_")[0] if name else (src or "shot")
        if not src:
            continue
        dst = os.path.join(out, f"{slug}.png")
        shutil.copy(os.path.join(extract, src), dst)
        print("  ✓", dst)
PY
done

echo "Done. Screenshots in: $OUT"
ls -1 "$OUT"/*.png 2>/dev/null || true
