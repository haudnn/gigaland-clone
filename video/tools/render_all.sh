#!/usr/bin/env bash
# full render of both formats + encode: tools/render_all.sh r2
set -euo pipefail
cd "$(dirname "$0")/.."
for fmt in 16x9 9x16; do
  rm -rf out/frames_$fmt
  node tools/render.mjs --fmt $fmt --workers 4 | tail -1
  tools/encode.sh $fmt out/frames_$fmt out/$1_$fmt.mp4
done
