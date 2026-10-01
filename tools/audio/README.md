# 発音音声（ニューラル音声）の生成

アプリの発音は `audio/vi/<key>.mp3`（事前生成したニューラル音声）を優先して再生する。
ブラウザ内蔵のベトナム語音声（macOS の Linh など）は声調の誤りが多く学習用には不正確なため。
ファイルが無い語・文だけ、ブラウザ内蔵音声で読み上げる（`script.js` の `speak()`）。

- 声：`vi-VN-HoaiMyNeural`（Microsoft・北部発音・女性）、少しゆっくり（-10%）
- ファイル名：`audioKey(text)` ＝ `speechText(text)` を小文字にした文字列のハッシュ。
  どちらも `script.js` に定義されていて、生成スクリプトも同じ関数を使う
- `audio/index.json`：生成済みキーの一覧。アプリは起動時に読み込み、無いキーは最初からブラウザ音声にする
- 生成には [edge-tts](https://github.com/rany2/edge-tts) を使う（Edgeの読み上げサービスの非公式利用）。
  商用化する場合は、同じ声が使える Azure AI Speech（公式）へ切り替えること

## 問題・語彙を追加したとき

```bash
python3 -m venv .venv && .venv/bin/pip install edge-tts   # 初回のみ
node tools/audio/extract-texts.mjs                          # 読み上げ対象を texts.json に書き出す
.venv/bin/python tools/audio/generate.py --prune            # 増えた分だけ生成・index.json 更新
```

`audio/` の差分（新しい mp3 と index.json）もコミットする。

## 声・速度を変えるとき

`generate.py` の `VOICE` / `RATE` を変え、`VOICE_VERSION` を上げてから `--force` で全件作り直す。
`index.json` の `version` が mp3 の URL の `?v=` になるので、ブラウザのキャッシュも更新される。

## 読み間違いのチェック

### 1. 耳で確かめる（発音チェックページ）

```bash
node tools/audio/extract-texts.mjs
python3 -m http.server 8090   # リポジトリ直下で
```

http://localhost:8090/tools/audio/review.html を開く。↑↓で次々に再生し、誤りには X で印をつける。
「印をつけた語をコピー」で一覧を取り出し、下の overrides.json に書いて作り直す。

### 2. 音声認識で候補を洗い出す

```bash
.venv/bin/pip install faster-whisper
.venv/bin/python tools/audio/verify.py --kind sentence
```

音声認識で聞き直し、元の文と食い違う音声を `tools/audio/verify-report.json` に書き出す。
`--model large-v3-turbo` を推奨（small は認識側の誤りが多い）。単語1つだけの音声は
大きいモデルでも誤認識が多いので、文のチェックが中心。結果は発音チェックページの
「音声認識で食い違い」で一覧でき、実際に聞いて確かめられる。

### 3. 誤りを直す（overrides.json）

```json
{
  "phạt": { "say": "phạt.", "voice": "vi-VN-NamMinhNeural" },
  "sao chép": { "say": "sao chép", "rate": "-25%" }
}
```

キーは表示どおりの語。`say`（実際に音声化する文字列）・`voice`・`rate` を必要な分だけ書き、
`generate.py` を実行すると、変更した語だけが作り直される（記録は `audio/overrides.lock.json`）。
