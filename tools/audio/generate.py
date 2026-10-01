"""tools/audio/texts.json の語・文をニューラル音声（edge-tts）で mp3 にし、
audio/vi/<key>.mp3 と audio/index.json を作る。

- 既にあるファイルは作り直さない（問題を追加したら、増えた分だけ生成される）
- --prune で texts.json に無くなった古いファイルを削除する
- 読み間違いが見つかった語は tools/audio/overrides.json で個別に直す（README参照）。
  overrides を変えた語は自動で作り直される
- 声・速度を変えたら VOICE_VERSION を上げ、--force で全件作り直す
  （index.json の version がURLの ?v= になり、ブラウザのキャッシュが更新される）

使い方:
  python3 -m venv .venv && .venv/bin/pip install edge-tts
  node tools/audio/extract-texts.mjs
  .venv/bin/python tools/audio/generate.py [--prune] [--force]
"""

import argparse
import asyncio
import json
import pathlib
import sys

import edge_tts

try:
    from gtts import gTTS  # override で engine: "gtts" を指定したときだけ使う
except ImportError:
    gTTS = None

ROOT = pathlib.Path(__file__).resolve().parents[2]
TEXTS = ROOT / "tools/audio/texts.json"
OUT_DIR = ROOT / "audio/vi"
INDEX = ROOT / "audio/index.json"
OVERRIDES = ROOT / "tools/audio/overrides.json"
STAMPS = ROOT / "audio/overrides.lock.json"

# 北部（ハノイ）発音の女性ニューラル音声。学習者向けに少しだけゆっくりにする
VOICE = "vi-VN-HoaiMyNeural"
RATE = {"word": "-10%", "sentence": "-10%"}
VOICE_VERSION = "hm1"
CONCURRENCY = 4
RETRIES = 4


def load_overrides():
    """{ "表示どおりの語": { "say": "音声化する文字列", "voice": "...", "rate": "-20%" } }
    engine: "gtts" を指定すると Google の音声（slow: true でゆっくり）で作る。"""
    if not OVERRIDES.exists():
        return {}
    data = json.loads(OVERRIDES.read_text(encoding="utf-8"))
    return {k.lower(): v for k, v in data.items() if not k.startswith("_")}


async def synth_one(item, override, out):
    """1件を音声化して out に保存する（一時的な失敗は待って再試行）。"""
    say = override.get("say", item["text"])
    for attempt in range(1, RETRIES + 1):
        try:
            tmp = out.with_suffix(".tmp")
            if override.get("engine") == "gtts":
                if gTTS is None:
                    raise RuntimeError("gTTS が入っていない（pip install gTTS）")
                await asyncio.to_thread(lambda: gTTS(say, lang="vi", slow=bool(override.get("slow"))).save(str(tmp)))
            else:
                voice = override.get("voice", VOICE)
                rate = override.get("rate", RATE[item["kind"]])
                await edge_tts.Communicate(say, voice, rate=rate).save(str(tmp))
            if tmp.stat().st_size < 1000:
                raise RuntimeError("音声が短すぎる")
            tmp.replace(out)
            return True
        except Exception as e:
            if attempt == RETRIES:
                print(f"\n失敗: {item['text']!r}: {e}", file=sys.stderr)
                return False
            await asyncio.sleep(2 * attempt)


async def synth(item, sem, force, override):
    out = OUT_DIR / f"{item['key']}.mp3"
    if out.exists() and out.stat().st_size > 0 and not force:
        return "skip"
    async with sem:
        return "new" if await synth_one(item, override, out) else "fail"


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--prune", action="store_true", help="texts.json に無いファイルを削除する")
    parser.add_argument("--force", action="store_true", help="既存ファイルも作り直す")
    args = parser.parse_args()

    items = json.loads(TEXTS.read_text(encoding="utf-8"))
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    overrides = load_overrides()
    # overrides の内容が前回生成時から変わった語は作り直す
    stamps = json.loads(STAMPS.read_text(encoding="utf-8")) if STAMPS.exists() else {}
    new_stamps = {}
    redo = set()
    for i in items:
        o = overrides.get(i["text"].lower())
        if o is None:
            if i["key"] in stamps:
                redo.add(i["key"])
            continue
        new_stamps[i["key"]] = o
        if stamps.get(i["key"]) != o:
            redo.add(i["key"])
    sem = asyncio.Semaphore(CONCURRENCY)
    tasks = [
        asyncio.create_task(synth(i, sem, args.force or i["key"] in redo, overrides.get(i["text"].lower(), {})))
        for i in items
    ]
    stats = {"new": 0, "skip": 0, "fail": 0}
    for n, task in enumerate(asyncio.as_completed(tasks), 1):
        stats[await task] += 1
        if n % 50 == 0 or n == len(tasks):
            print(f"\r{n}/{len(tasks)} 新規{stats['new']} 既存{stats['skip']} 失敗{stats['fail']}", end="", flush=True)
    print()

    wanted = {i["key"] for i in items}
    if args.prune:
        for f in OUT_DIR.glob("*.mp3"):
            if f.stem not in wanted:
                f.unlink()
    keys = sorted(k for k in wanted if (OUT_DIR / f"{k}.mp3").exists())
    INDEX.write_text(
        json.dumps({"version": VOICE_VERSION, "voice": VOICE, "keys": keys}, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    STAMPS.write_text(json.dumps(new_stamps, ensure_ascii=False, indent=1, sort_keys=True) + "\n", encoding="utf-8")
    print(f"audio/index.json: {len(keys)}件")
    if stats["fail"]:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
