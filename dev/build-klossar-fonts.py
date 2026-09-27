"""Build offline tile fonts: python dev/build-klossar-fonts.py SOURCE_DIRECTORY.

Requires fontTools. Download NotoSansCJKtc-Bold.otf and NotoSerifCJKtc-Bold.otf
from notofonts/noto-cjk ({Sans,Serif}/OTF/TraditionalChinese), alongside the
{Sans,Serif}/LICENSE files saved as Noto{Sans,Serif}CJK-OFL.txt.
Rebuild after adding Chinese characters to language-exercises.json/homework.json.
"""
import hashlib
import json
import re
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1])
destination = root / "resources/fonts"
destination.mkdir(exist_ok=True)


def strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for item in value.values():
            yield from strings(item)
    elif isinstance(value, list):
        for item in value:
            yield from strings(item)


# Latin, pinyin tone marks, punctuation, maths and bopomofo, plus every Han
# character in the editable exercises and homework. Keep the downloads small.
codepoints = set()
for first, last in [(0x20, 0x24F), (0x300, 0x36F), (0x2000, 0x206F),
                    (0x2190, 0x22FF), (0x3000, 0x303F), (0x3100, 0x312F),
                    (0x31A0, 0x31BF), (0xFF00, 0xFFEF)]:
    codepoints.update(range(first, last + 1))
han = set()
for filename in ["language-exercises.json", "homework.json"]:
    data = json.loads((root / filename).read_text(encoding="utf-8"))
    for text in strings(data):
        han.update(ord(char) for char in text if 0x3400 <= ord(char) <= 0x9FFF
                   or 0x20000 <= ord(char) <= 0x323AF)
codepoints.update(han)

for style in ["Sans", "Serif"]:
    font = TTFont(source / f"Noto{style}CJKtc-Bold.otf", recalcTimestamp=False)
    missing = han - font.getBestCmap().keys()
    if missing:
        raise ValueError(f"{style} lacks exercise characters: {sorted(missing)}")
    options = subset.Options()
    options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14, 16, 17]
    options.name_languages = [0x409]
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=codepoints)
    subsetter.subset(font)
    family = f"Skolarkaden Tile {style}"
    for name_id, value in {1: family, 2: "Bold", 4: family + " Bold",
                           6: f"SkolarkadenTile{style}-Bold", 16: family,
                           17: "Bold"}.items():
        font["name"].setName(value, name_id, 3, 1, 0x409)
    font.flavor = "woff"
    output = destination / f"klossar-{style.lower()}.woff"
    font.save(output)
    license_name = f"Noto{style}CJK-OFL.txt"
    (destination / license_name).write_bytes((source / license_name).read_bytes())
    css = root / "resources/klossar.css"
    version = hashlib.sha256(output.read_bytes()).hexdigest()[:12]
    css.write_text(re.sub(r"fonts/" + re.escape(output.name) + r"(?:\?v=[a-f0-9]+)?",
                          "fonts/" + output.name + "?v=" + version,
                          css.read_text(encoding="utf-8")), encoding="utf-8")
    print(f"{output.name}: {output.stat().st_size:,} bytes, {len(han)} Han characters")
