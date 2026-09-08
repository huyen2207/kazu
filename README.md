# KAZU — 日本人向けベトナム語学習Webアプリ

日本語母語話者のベトナム語初級学習者（CEFR A2前後）向けの語彙学習アプリ。

**問題を解く → 解説を読む → 語彙を理解する → Flash Cardで復習する → 再び問題で確認する**

という学習サイクルで、実際に使えるベトナム語語彙力を身につける。

詳細なルールは [CLAUDE.md](CLAUDE.md) を参照。

## プロジェクト構成

```
project/
│
├── CLAUDE.md                  # プロジェクト全体のルール
│
├── prompts/                   # AI用プロンプト
│   ├── question-generator.md  # CEFR A2問題生成
│   ├── question-validator.md  # 問題品質検証（PASS/FAIL）
│   └── vocabulary-manager.md  # 語彙管理（TODO）
│
├── src/
│   ├── app/                   # 画面（home / quiz / vocabulary / flashcards / review / history / statistics）
│   ├── components/            # UIコンポーネント（quiz / vocabulary / flashcards / statistics）
│   ├── services/              # ビジネスロジック
│   │   └── ai/                # AI連携（生成・検証・語彙管理）
│   ├── lib/                   # SRS・習熟度スコア・重複検出・語彙正規化
│   ├── types/                 # 型定義（question / vocabulary / review / statistics）
│   └── db/                    # スキーマ・クエリ
│
└── data/                      # 問題・語彙・シードデータ
    ├── questions/
    ├── vocabulary/
    └── seed/
```

## 問題生成フロー

```
Question Generator（prompts/question-generator.md）
      ↓
Question Validator（prompts/question-validator.md）
      ↓
    PASS のみ
      ↓
Databaseへ保存
      ↓
ユーザーへ表示
```

FAILの問題は破棄してGeneratorへ戻す。**問題数より問題の品質を優先する。**

## 主な機能

- Home
- Quiz（New / Review / Weak Points / Random、10・20・30問）
- Quiz Result（日本語解説・選択肢ごとの説明・語彙・文法・コロケーション）
- Vocabulary
- Flash Cards（forgotten / unsure / mastered 評価）
- Review（簡易SRS）
- Learning History
- Statistics / Dashboard（Today / Last 7 Days / Total・学習ストリーク）

## 学習データの保存とマイグレーション（静的版）

静的版（`index.html` / `script.js` / `style.css`）は、学習データを localStorage の
`kazu-static-v1` キーに1つのJSONとして保存する。

```
{ version, answered, vocab, days, sessions, level, speechSpeed }
```

読み込み時の流れは `script.js` の「永続化（localStorage）」ブロックにまとまっている。

1. `loadStore()` が保存データを読む
2. JSONとして読めない場合は、初期化する前に元データを `kazu-static-v1-broken` へ退避する
3. 読めた場合は `migrate()` を通す。`version` が無いデータは version 1 とみなす
4. `migrate()` は `MIGRATIONS`（キー＝変換前のversion）を1段ずつ適用し、`SCHEMA_VERSION` まで上げる

**スキーマを変えるときにやること**

- `SCHEMA_VERSION` を1つ上げる
- `MIGRATIONS` に「変換前のversion」をキーにした変換関数を1つ足す

変換の分岐は `MIGRATIONS` の1か所だけに置く。読み込み後にあちこちでフィールドを補完しない。
語彙レコードの既定値は `normalizeVocabRecord()` にまとめてあるので、フィールドを増やしたときは
ここにも既定値を足す。

保存に失敗した場合（容量超過・プライベートモードなど）は、画面上部に警告を表示する。
