#!/usr/bin/env bash
# Сборка 30-секундного ТВ-ролика: фонограмма + иллюстрации + заставка.
#
#   ./assemble.sh --audio /path/kprf.mp3 [--start 00:02:25] [--duration 30]
#
# На выходе (в output/):
#   kprf_30sec_master.mov  — ProRes 422 HQ + PCM 24 bit, мастер для эфира
#   kprf_30sec_preview.mp4 — H.264 для согласования
#   loudness.txt           — замер громкости мастера (EBU R128)
#
# Требуется полноценный ffmpeg/ffprobe (не урезанная сборка из Playwright).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRAMES="$ROOT/output/frames"
OUT="$ROOT/output"
WORK="$OUT/work"

AUDIO=""
START="00:02:25"     # дубль начинается здесь
DURATION="30"        # хронометраж ролика
FPS="25"
ZOOM_MAX="1.08"      # лёгкий наезд, чтобы статика не «висела» в эфире

while [[ $# -gt 0 ]]; do
  case "$1" in
    --audio)    AUDIO="$2"; shift 2 ;;
    --start)    START="$2"; shift 2 ;;
    --duration) DURATION="$2"; shift 2 ;;
    --fps)      FPS="$2"; shift 2 ;;
    *) echo "Неизвестный аргумент: $1" >&2; exit 2 ;;
  esac
done

[[ -n "$AUDIO" ]] || { echo "Не указан --audio (исходная запись КПРФ)" >&2; exit 2; }
[[ -f "$AUDIO" ]] || { echo "Файл не найден: $AUDIO" >&2; exit 2; }
command -v ffmpeg  >/dev/null || { echo "Нет ffmpeg" >&2; exit 1; }
command -v ffprobe >/dev/null || { echo "Нет ffprobe" >&2; exit 1; }

mkdir -p "$WORK" "$OUT"
rm -f "$WORK"/seg_*.mov "$WORK/concat.txt"

# --- 1. Фонограмма: вырезаем дубль и приводим к вещательной громкости --------
echo "→ Фонограмма: $START +${DURATION}с"
SRC_LEN="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$AUDIO")"
echo "  длина исходника: ${SRC_LEN}с"

ffmpeg -y -v error -ss "$START" -t "$DURATION" -i "$AUDIO" \
  -af "loudnorm=I=-23:TP=-1:LRA=7,aresample=48000" \
  -ac 2 -c:a pcm_s24le "$WORK/vo.wav"

VO_LEN="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$WORK/vo.wav")"
echo "  вырезано: ${VO_LEN}с"

# --- 2. Видеоряд: кадр за кадром по timeline.txt -----------------------------
i=0
total=0
while read -r file dur; do
  [[ -z "${file:-}" || "$file" == \#* ]] && continue
  src="$FRAMES/$file"
  [[ -f "$src" ]] || { echo "Нет кадра: $src" >&2; exit 1; }
  nframes="$(python3 -c "print(round($dur*$FPS))")"
  seg="$(printf '%s/seg_%02d.mov' "$WORK" "$i")"
  echo "→ Кадр $file — ${dur}с (${nframes} кадров)"

  if [[ "$file" == *endcard* ]]; then
    VF="scale=1920:1080:flags=lanczos,format=yuv422p10le"
  else
    VF="scale=3840:2160:flags=lanczos,zoompan=z='min(zoom+0.0006,${ZOOM_MAX})':d=${nframes}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=${FPS},format=yuv422p10le"
  fi

  ffmpeg -y -v error -loop 1 -framerate "$FPS" -i "$src" \
    -frames:v "$nframes" -vf "$VF" -r "$FPS" \
    -c:v prores_ks -profile:v 3 "$seg"

  echo "file '$seg'" >> "$WORK/concat.txt"
  total="$(python3 -c "print(round($total+$dur,3))")"
  i=$((i+1))
done < "$ROOT/build/timeline.txt"

echo "→ Суммарный хронометраж видеоряда: ${total}с"
python3 - "$total" "$DURATION" <<'PY'
import sys
t, d = float(sys.argv[1]), float(sys.argv[2])
if abs(t - d) > 0.04:
    sys.exit(f"ОШИБКА: видеоряд {t}с не совпадает с хронометражом {d}с — поправьте build/timeline.txt")
PY

# --- 3. Мастер и превью ------------------------------------------------------
echo "→ Мастер ProRes 422 HQ"
ffmpeg -y -v error -f concat -safe 0 -i "$WORK/concat.txt" -i "$WORK/vo.wav" \
  -map 0:v -map 1:a -c:v copy -c:a pcm_s24le -shortest \
  "$OUT/kprf_30sec_master.mov"

echo "→ Превью H.264"
ffmpeg -y -v error -i "$OUT/kprf_30sec_master.mov" \
  -c:v libx264 -profile:v high -preset slow -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -movflags +faststart \
  "$OUT/kprf_30sec_preview.mp4"

echo "→ Замер громкости"
ffmpeg -v error -nostats -i "$OUT/kprf_30sec_master.mov" \
  -af ebur128=peak=true -f null - 2> "$OUT/loudness.txt" || true
tail -12 "$OUT/loudness.txt" || true

echo
echo "Готово:"
echo "  $OUT/kprf_30sec_master.mov"
echo "  $OUT/kprf_30sec_preview.mp4"
