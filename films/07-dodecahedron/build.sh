#!/bin/sh
# No. 7 · The Roman Dodecahedron (Archive Room · Orbit · Studio 3D). One command, from anywhere:
#   LIB=<lemo-opuscar library> sh films/07-dodecahedron/build.sh
# Needs the library's deps + voice tier, its HDRIs (tools/fetch.sh hdri), ffmpeg 7+ on PATH, and the sample libraries salamander, vsco2ce, vcsl, freepats.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
[ -n "$LIB" ] && [ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the lemo-opuscar library folder"; exit 1; }
export LIB
PY="$LIB/.venv/bin/python"
NAME=07-dodecahedron
# sources (gitignored): Library of Congress, The Met, Wikimedia Commons
[ -f "$HERE/fonts/PlexMono-400.woff2" ] || "$PY" -I "$HERE/tools/fonts.py" "$HERE"
sh "$HERE/tools/fetch.sh" "$HERE"
"$PY" -I "$HERE/tools/prep.py" "$HERE"
# voice: Kokoro (am_michael), speech-to-text check
"$PY" "$LIB/core/tts/tts.py" "$HERE/voice/lines.json" "$HERE/voice/out"
WHISPER_MODEL=small.en "$PY" "$LIB/core/tts/asr_check.py" "$HERE/voice/lines.json" "$HERE/voice/out" --lang en
node "$HERE/tools/export.mjs" "$HERE"
# layout (texts inside plates, no overlaps), picture, score + mix, master, subtitles
cd "$LIB"
node "$HERE/shared/layoutcheck.mjs" "$HERE" --step 0.2
node core/render/video.mjs "$HERE" --fps 24 --workers 4 --out "$HERE/out/video.mp4"
"$PY" "$HERE/mix.py"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/out/$NAME.mp4" 24 2
"$PY" core/render/srt.py "$HERE/out/cues_srt.json" "$HERE/out/$NAME.srt"
node core/render/readcheck.mjs "$HERE" > "$HERE/out/readcheck.txt" && echo "readcheck ok"
echo "done: $HERE/out/$NAME.mp4"
