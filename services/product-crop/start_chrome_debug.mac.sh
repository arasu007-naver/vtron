#!/bin/bash
# Start a dedicated Chrome with remote debugging for Naver capture.
# Close other Chrome windows first if this fails to start.

set -euo pipefail
PORT="${1:-9222}"
PROFILE="${HOME}/chrome-naver-debug"
mkdir -p "$PROFILE"

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [[ ! -x "$CHROME" ]]; then
  CHROME="/Applications/Chromium.app/Contents/MacOS/Chromium"
fi
if [[ ! -x "$CHROME" ]]; then
  echo "Chrome not found in /Applications" >&2
  exit 1
fi

echo "Starting Chrome on port $PORT"
echo "1) Log into Naver Shopping in that window if needed"
echo "2) Open one catalog URL and confirm the product page loads"
echo "3) Keep this Chrome open, then run capture with --cdp"
exec "$CHROME" \
  --remote-debugging-port="$PORT" \
  --user-data-dir="$PROFILE" \
  --no-first-run \
  --no-default-browser-check \
  "https://search.shopping.naver.com/"
