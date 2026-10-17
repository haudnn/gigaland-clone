#!/usr/bin/env bash
# Mix music + sfx, normalise to -14 LUFS / -1 dBTP (two-pass loudnorm), export music-only too.
set -euo pipefail
cd "$(dirname "$0")/.."
A=audio
# sfx sit just above the music in their own bands; music bed kept low
ffmpeg -y -loglevel error -i $A/music_raw.wav -i $A/sfx_raw.wav -filter_complex \
  "[0]volume=1.0[m];[1]volume=1.0[s];[m][s]amix=inputs=2:normalize=0[out]" -map "[out]" -c:a pcm_f32le $A/mix_raw.wav

norm() {  # in out
  local stats
  stats=$(ffmpeg -hide_banner -i "$1" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
  local mi mtp mlra mth off
  mi=$(echo "$stats" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d['input_i'],d['input_tp'],d['input_lra'],d['input_thresh'],d['target_offset'])")
  read -r mi mtp mlra mth off <<<"$mi"
  ffmpeg -y -loglevel error -i "$1" -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$mi:measured_TP=$mtp:measured_LRA=$mlra:measured_thresh=$mth:offset=$off:linear=true,aresample=48000" -c:a pcm_s16le "$2"
}
norm $A/mix_raw.wav $A/mix.wav
norm $A/music_raw.wav $A/music_only.wav
for f in mix music_only; do
  echo "== $f"; ffmpeg -hide_banner -i $A/$f.wav -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I:|Peak:|LRA:)" | tail -3
done
