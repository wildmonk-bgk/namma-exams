#!/bin/sh
# Render a lesson thumbnail (1280×720 PNG) from engine/thumbnail.html with headless Chrome.
# Needs the local server running on port 8123 (python3 -m http.server 8123).
# Usage: engine/make-thumbnail.sh OUTPUT.png "Title|Second line" "Kannada line" "Kicker"
set -e
out="$1"; title="$2"; kn="$3"; kicker="$4"
chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
enc() { python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1]))' "$1"; }
url="http://localhost:8123/engine/thumbnail.html?title=$(enc "$title")&kn=$(enc "$kn")&kicker=$(enc "$kicker")"
tmp="$(mktemp -d)"
"$chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=1280,720 --virtual-time-budget=6000 --user-data-dir="$tmp/profile" \
  --screenshot="$tmp/thumb.png" "$url" >/dev/null 2>&1
cp "$tmp/thumb.png" "$out"
rm -rf "$tmp"
sips -g pixelWidth -g pixelHeight "$out" | tail -2
