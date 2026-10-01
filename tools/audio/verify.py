"""生成した音声を音声認識（faster-whisper）で聞き直し、元の文と食い違うものを一覧にする。
音声の読み間違い（声調・語の脱落）を人が聞く前に機械的に洗い出すためのチェック。

使い方:
  .venv/bin/pip install faster-whisper
  .venv/bin/python tools/audio/verify.py [--kind sentence|word|all] [--model small]
結果は tools/audio/verify-report.json に書き出す（食い違いの大きい順）。
※ 単語1つだけの音声は認識側の誤りも多いので、レポートは「聞いて確かめる候補」として使う。
"""

import argparse
import json
import pathlib
import re
import shutil
import subprocess
import tempfile
import unicodedata
import wave

import numpy as np

from faster_whisper import WhisperModel

ROOT = pathlib.Path(__file__).resolve().parents[2]


def syllables(text):
    text = unicodedata.normalize("NFC", text.lower())
    return re.findall(r"[0-9a-zà-ỹđ]+", text)


def distance(a, b):
    prev = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        cur = [i]
        for j, y in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x != y)))
        prev = cur
    return prev[-1]


def load_audio(path):
    """mp3 を 16kHz モノラルの配列にする（macOS は afconvert、それ以外は faster-whisper に任せる）。"""
    if not shutil.which("afconvert"):
        return str(path)
    with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
        subprocess.run(["afconvert", "-f", "WAVE", "-d", "LEI16@16000", "-c", "1", str(path), tmp.name], check=True)
        with wave.open(tmp.name) as w:
            pcm = w.readframes(w.getnframes())
    return np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768.0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--kind", default="sentence", choices=["sentence", "word", "all"])
    parser.add_argument("--model", default="large-v3-turbo")
    args = parser.parse_args()

    items = json.loads((ROOT / "tools/audio/texts.json").read_text(encoding="utf-8"))
    items = [i for i in items if args.kind == "all" or i["kind"] == args.kind]
    model = WhisperModel(args.model, device="cpu", compute_type="int8")
    report = []
    for n, item in enumerate(items, 1):
        path = ROOT / "audio/vi" / f"{item['key']}.mp3"
        if not path.exists():
            report.append({**item, "heard": None, "error": 1.0})
            continue
        segments, _ = model.transcribe(load_audio(path), language="vi", beam_size=5, initial_prompt=None)
        heard = " ".join(s.text.strip() for s in segments)
        ref, hyp = syllables(item["text"]), syllables(heard)
        err = distance(ref, hyp) / max(len(ref), 1)
        if err > 0:
            report.append({**item, "heard": heard, "error": round(err, 3)})
        if n % 25 == 0:
            print(f"{n}/{len(items)} 食い違い{len(report)}", flush=True)
    report.sort(key=lambda r: -r["error"])
    out = ROOT / "tools/audio/verify-report.json"
    out.write_text(json.dumps(report, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(items)}件中 {len(report)}件に食い違い → {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
