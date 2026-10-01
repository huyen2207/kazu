"""読み間違いの報告があった語・文について、別の声・速さ・エンジンで作った候補音声を作る。
候補は発音チェックページ（review.html）で聞き比べ、一番自然なものを選ぶ。
選んだ候補は「選んだ候補をコピー」で overrides.json 用のJSONとして取り出せる。

使い方:
  .venv/bin/pip install edge-tts gTTS
  .venv/bin/python tools/audio/candidates.py "theo thói quen" "ưu tiên" ...
出力: audio/candidates/<key>/<候補id>.mp3 と audio/candidates/index.json
"""

import asyncio
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from generate import ROOT, TEXTS, synth_one  # noqa: E402

OUT = ROOT / "audio/candidates"
INDEX = OUT / "index.json"

# 現在の音声（HoaiMy -10%）と比べる候補
VARIANTS = [
    ("hm_slow", "HoaiMy (nữ) chậm", {"voice": "vi-VN-HoaiMyNeural", "rate": "-30%"}),
    ("nm", "NamMinh (nam)", {"voice": "vi-VN-NamMinhNeural", "rate": "-10%"}),
    ("nm_slow", "NamMinh (nam) chậm", {"voice": "vi-VN-NamMinhNeural", "rate": "-30%"}),
    ("gg", "Google (nữ)", {"engine": "gtts"}),
    ("gg_slow", "Google (nữ) chậm", {"engine": "gtts", "slow": True}),
]


async def main():
    wanted = [w.strip().lower() for w in sys.argv[1:] if w.strip()]
    if not wanted:
        sys.exit("語・文を引数で指定してください")
    items = {i["text"].lower(): i for i in json.loads(TEXTS.read_text(encoding="utf-8"))}
    index = json.loads(INDEX.read_text(encoding="utf-8")) if INDEX.exists() else {}
    for w in wanted:
        item = items.get(w)
        if not item:
            print(f"見つからない（texts.json に無い）: {w}")
            continue
        folder = OUT / item["key"]
        folder.mkdir(parents=True, exist_ok=True)
        entry = []
        for vid, label, override in VARIANTS:
            out = folder / f"{vid}.mp3"
            if not out.exists():
                await synth_one(item, override, out)
            entry.append({"id": vid, "label": label, "override": override})
        index[item["key"]] = {"text": item["text"], "variants": entry}
        print(f"候補を作成: {item['text']}")
    INDEX.write_text(json.dumps(index, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


if __name__ == "__main__":
    asyncio.run(main())
