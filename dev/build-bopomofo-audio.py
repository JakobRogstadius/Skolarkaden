"""Convert the MOE's CC BY 4.0 sound archive to small, locally served MP3s.

Usage: python3 dev/build-bopomofo-audio.py /path/to/bopomofo_materials_20170213.zip
Requires ffmpeg. Source and attribution: resources/audio/bopomofo/README.md.
"""
from pathlib import Path
import subprocess
import sys
import zipfile

destination = Path(__file__).resolve().parents[1] / 'resources/audio/bopomofo'
destination.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(sys.argv[1]) as archive:
    for index in range(37):
        # The handbook's F1–F37 follow Unicode order, ㄅ (3105) to ㄩ (3129).
        subprocess.run([
            'ffmpeg', '-y', '-loglevel', 'error', '-i', 'pipe:0', '-ac', '1',
            '-codec:a', 'libmp3lame', '-b:a', '48k',
            str(destination / f'{0x3105 + index:x}.mp3'),
        ], input=archive.read(f'audio/F{index + 1}.WAV'), check=True)
    (destination / 'LICENSE.txt').write_bytes(archive.read('license.txt'))
