#!/usr/bin/env bash
# encode frames + mix to MP4: tools/encode.sh 16x9 out/frames_16x9 out/gigaland-clone_16x9.mp4
set -euo pipefail
cd "$(dirname "$0")/.."
ffmpeg -y -loglevel error -framerate 60 -i "$2/%05d.png" -i audio/mix.wav \
  -map 0:v -map 1:a -c:v libx264 -preset slow -crf 15 -pix_fmt yuv420p -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  -r 60 -frames:v 1200 -c:a aac -b:a 320k -ar 48000 -t 20 -movflags +faststart "$3"
ffprobe -v error -show_entries stream=codec_type,width,height,r_frame_rate,nb_frames,duration -of compact "$3"
