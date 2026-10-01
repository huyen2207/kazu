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

公開サイトの https://huyen2207.github.io/kazu/tools/audio/review.html で開ける
（ローカルならリポジトリ直下で `python3 -m http.server 8090` → http://localhost:8090/tools/audio/review.html）。↑↓で次々に再生し、誤りには X で印をつける。
「印をつけた語をコピー」で一覧を取り出し、下の overrides.json に書いて作り直す。

### 2. 音声認識で候補を洗い出す

```bash
.venv/bin/pip install faster-whisper
.venv/bin/python tools/audio/verify.py --kind sentence
```

音声認識で聞き直し、元の文と食い違う音声を `tools/audio/verify-report.json` に書き出す。
既定のモデルは large-v3-turbo（small は認識側の誤りが多い）。数字の書き方や、北部発音で同じ音になる
綴り（s/x・ch/tr・d/gi/r）の違いは比較前にそろえるので、レポートには実際の聞き違いだけが残る。
2026-10 の初回チェックでは文752件中145件に食い違いがあったが、同じ文を別の声（NamMinh）で
作って比べると食い違いの件数はほぼ同じで、大半は認識側の誤りだった。
レポートの error が 1 以上の70件は「NamMinh では正しく認識された」文で、優先して聞く候補。単語1つだけの音声は
大きいモデルでも誤認識が多いので、文のチェックが中心。結果は発音チェックページの
「音声認識で食い違い」で一覧でき、実際に聞いて確かめられる。

### 3. 候補を作って選んでもらう（candidates.py）

ネイティブが「誤り」と報告した語は、別の声・速さ・Googleの音声で候補を作り、
発音チェックページで聞き比べて選んでもらう（ページの「Có phương án để chọn」に出る）。

```bash
.venv/bin/pip install gTTS
.venv/bin/python tools/audio/candidates.py "ưu tiên" "tự tin"
```

選ばれた候補は「Sao chép kết quả」に overrides.json 用のJSONとして入ってくるので、そのまま下の手順で反映する。
音声認識（Whisper）では正しく聞こえても、声調・母音（ư/ơ など）の不自然さはネイティブにしか分からない。

### 4. 誤りを直す（overrides.json）

```json
{
  "phạt": { "say": "phạt.", "voice": "vi-VN-NamMinhNeural" },
  "sao chép": { "say": "sao chép", "rate": "-25%" }
}
```

キーは表示どおりの語。`say`（実際に音声化する文字列）・`voice`・`rate`、
Googleの音声なら `"engine": "gtts"`（`"slow": true` でゆっくり）を必要な分だけ書き、
`generate.py` を実行すると、変更した語だけが作り直される（記録は `audio/overrides.lock.json`）。
