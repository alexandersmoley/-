#!/usr/bin/env bash
# Рендер исходников (SVG-иллюстрации + HTML-заставка) в PNG 1920x1080.
# Требуется Chromium. Путь можно переопределить: CHROME=/path/to/chrome ./render.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/output/frames"
TMP="$(mktemp -d)"
CHROME="${CHROME:-/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell}"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$OUT"

shot () { # $1 = html-файл, $2 = имя PNG
  "$CHROME" --headless --disable-gpu --no-sandbox --hide-scrollbars \
    --force-device-scale-factor=1 --window-size=1920,1080 \
    --screenshot="$OUT/$2" "file://$1" >/dev/null 2>&1
  echo "  → output/frames/$2"
}

# SVG инлайним в страницу без полей, чтобы кадр был ровно 1920x1080
wrap_svg () { # $1 = путь к svg → печатает путь к html
  local name; name="$(basename "${1%.svg}")"
  {
    printf '%s\n' '<!doctype html><meta charset="utf-8">' \
      '<style>html,body{margin:0;padding:0;width:1920px;height:1080px;overflow:hidden;background:#fff}' \
      'svg{display:block;width:1920px;height:1080px}</style>'
    cat "$1"
  } > "$TMP/$name.html"
  echo "$TMP/$name.html"
}

echo "Иллюстрации:"
for f in "$ROOT"/assets/illustrations/*.svg; do
  shot "$(wrap_svg "$f")" "$(basename "${f%.svg}").png"
done

echo "Заставка:"
shot "$ROOT/assets/endcard/endcard.html" "06-endcard.png"

echo "Готово. PNG: $OUT"
