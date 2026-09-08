# ベトナム語学習Webアプリ プロジェクトルール

## 1. プロジェクトの目的

このプロジェクトでは、日本人向けのベトナム語学習Webアプリを開発する。

主な対象者は：

- 日本語母語話者
- ベトナム語初級者
- CEFR A2レベル前後
- 語彙力を増やしたい学習者
- 問題演習を通して語彙・文法を定着させたい学習者

このアプリでは、単に問題を解くだけではなく、

**問題を解く → 解説を読む → 語彙を理解する → 間違えた語彙をFlash Cardで復習する → 再び問題で確認する**

という学習サイクルを作る。

## 2. 最重要設計思想

このアプリでは、**問題数より問題の品質を優先する。**

以下は禁止する。

- 正解が2つ以上存在する問題
- 文脈が不足している問題
- 不自然なベトナム語
- A2レベルを大きく超える語彙
- 過去問題とほぼ同じ問題
- 同じ正解語彙ばかり出題する
- 日本語解説と正解が一致していない問題
- 不自然すぎるダミー選択肢
- 文法だけで簡単に消去できる低品質問題

AIが生成した問題は、必ずValidatorによる検証を通してからユーザーに表示する。

## 3. プロジェクト構成

問題生成に関する責任を分離する。

- **CLAUDE.md** — プロジェクト全体のルールを管理する。
- **prompts/question-generator.md** — CEFR A2レベルの問題を生成する。
- **prompts/question-validator.md** — 生成された問題が適切か検証する。
- **prompts/vocabulary-manager.md** — 語彙の抽出・整形・復習候補の選定を管理する。

処理フロー：

```
Question Generator
      ↓
Question Validator
      ↓
    PASS
      ↓
Databaseへ保存
      ↓
ユーザーへ表示
```

ValidatorでFAILになった問題は表示しない。

## 4. 主な機能

アプリには最低限以下の機能を実装する。

- Home
- Quiz
- Quiz Result
- Vocabulary
- Flash Cards
- Review
- Learning History
- Statistics / Dashboard

## 5. Quiz

基本問題形式は4択。

例：

> Vì căn phòng quá bừa bộn, tôi phải ______ lại đồ đạc trước khi khách đến.
>
> A. sắp xếp
> B. chuẩn bị
> C. xây dựng
> D. trang bị

原則として1セット：

- 10問
- 20問
- 30問

から選択できるようにする。

## 6. Quizの種類

以下のモードを用意する。

- **New Vocabulary** — まだ十分に学習していない新しい語彙を中心に出題する。
- **Review** — 過去に間違えた語彙・あやふやな語彙を中心に出題する。
- **Weak Points** — 正答率の低い語彙や文法を優先する。
- **Random** — 新規語彙と復習語彙を混ぜる。

## 7. 問題レベル

基本レベル：**CEFR A2**

- A1の基礎語彙を使用してもよい。
- A2上位の語彙も、文脈が十分に分かりやすい場合は使用可能。
- B1以上の難解な語彙・抽象表現は原則避ける。

## 8. 主なトピック

問題は日常生活を中心にする。

- 自己紹介
- 家族
- 友人
- 家
- 部屋
- 食事
- 買い物
- 学校
- 仕事
- 時間
- 日付
- 天気
- 交通
- 旅行
- 病院
- 健康
- 趣味
- 約束
- 日常生活
- 感情
- 電話
- レストラン
- カフェ
- ホテル
- 銀行
- 郵便局
- 道案内

## 9. 問題重複防止

すべての出題済み問題を記録する。

新しい問題を生成するときは以下をAIへ渡す。

- `previousQuestions`
- `recentlyUsedVocabulary`
- `recentlyUsedGrammar`
- `recentlyUsedTopics`
- `weakVocabulary`
- `weakGrammar`
- `masteredVocabulary`

Generatorはこれらを参考に新しい問題を生成する。

## 10. 「重複」の定義

完全一致だけでなく、意味的な重複も避ける。

例：

- 既存：Tôi phải sắp xếp lại phòng trước khi khách đến.
- 新規：Tôi phải sắp xếp lại nhà trước khi bạn đến.

これは準重複として扱う。

以下を比較する。

- 文の意味
- 文型
- 正解語彙
- 状況
- トピック

## 11. 復習目的の再出題

学習済み語彙を完全に禁止しない。

区別する：

- **New Mode** — 最近使用した正解語彙をできるだけ避ける。
- **Review Mode** — 間違えた語彙を意図的に再利用する。

ただし、同じ例文をそのまま使用してはいけない。
違う状況・違う文章で出題する。

## 12. Quiz終了後の解説

回答後に以下を表示する。

1. 正解
2. 文全体の日本語訳
3. 正解の理由
4. A/B/C/Dすべての選択肢の説明
5. 重要語彙
6. 文法
7. コロケーション
8. 必要な場合、類義語との違い

解説は日本語で行う。

## 13. 解説言語

解説対象は日本人なので、日本語を使用する。

日本語は：

- 簡潔
- 自然
- JLPT N3程度でも理解できる
- 専門用語を使いすぎない

ことを重視する。

## 14. Vocabulary

問題に登場する重要語彙をVocabularyとして保存する。

**語彙管理の詳細ルールは `prompts/vocabulary-manager.md` を正とする。**

最低限以下を保持する（vocabulary-manager.md セクション4参照）。

```ts
type VocabularyItem = {
  id: string

  vietnamese: string
  normalizedVietnamese: string

  japaneseMeaning: string
  partOfSpeech: string

  level: "A1" | "A2"
  category: string

  exampleSentence?: string
  exampleJapanese?: string

  collocations?: {
    expression: string
    meaningJP: string
  }[]

  synonyms?: string[]
  antonyms?: string[]

  status:
    | "new"
    | "learning"
    | "forgotten"
    | "unsure"
    | "reviewing"
    | "mastered"

  exposureCount: number

  quizCorrectCount: number
  quizWrongCount: number

  flashcardCorrectCount: number
  flashcardWrongCount: number

  consecutiveCorrect: number
  consecutiveWrong: number

  masteryScore: number

  firstSeenAt: string
  lastSeenAt?: string
  lastReviewedAt?: string
  nextReviewAt?: string

  sourceQuestionIds: string[]

  reviewPriority: number
}
```

## 15. Flash Card

Flash Card表面：

- ベトナム語
- 品詞

裏面：

- 日本語意味
- 簡単な説明
- 例文
- 日本語訳
- コロケーション
- 類義語
- 反対語
- 注意点

## 16. Flash Card評価

各カードには以下を表示する。

| 評価 | 内部処理 |
| --- | --- |
| 覚えていない | `forgotten` にする |
| あやふや | `unsure` にする |
| 覚えた | 即masteredにしない。`reviewing`、または条件を満たした場合のみ `mastered`（vocabulary-manager.md セクション11・18参照） |

## 17. 間違えた問題との連携

ユーザーが問題を間違えた場合：

- 正解語彙
- 問題の重要語彙

を復習候補へ追加する。

すべての単語を追加してはいけない。
学習価値の高い語だけを選ぶ。

## 18. Spaced Repetition

簡易SRSを実装する。

**詳細ルールは `prompts/vocabulary-manager.md`（セクション20・21）を正とする。**

初期ルール：

| ステータス | 再復習タイミング |
| --- | --- |
| `new` | 初回学習後：1日以内 |
| `forgotten` | 0～1日 |
| `unsure` | 1～3日 |
| `learning` | 2～4日 |
| `reviewing` | 3～7日 |
| `mastered` | 14～30日 |

- 連続正解によって復習間隔を伸ばす（例：1日 → 3日 → 7日 → 14日 → 30日）。
- 連続不正解の場合は短くする。

## 19. Learning History

以下を保存する。

```ts
type StudySession = {
  id: string

  startedAt: string
  finishedAt: string

  questionCount: number
  correctCount: number
  wrongCount: number

  accuracy: number

  studiedVocabulary: string[]
  wrongVocabulary: string[]

  studyTimeSeconds: number
}
```

## 20. Answer History

各回答を保存する。

```ts
type AnswerHistory = {
  questionId: string

  selectedAnswer: string
  correctAnswer: string

  isCorrect: boolean

  responseTimeSeconds: number

  answeredAt: string
}
```

## 21. Dashboard

以下を表示する。

**Today**

- 学習時間
- 問題数
- 正解率
- 新規語彙
- 復習語彙

**Last 7 Days**

- 学習日数
- 問題数
- 平均正答率
- 学習時間
- 学習語彙数

**Total**

- 総学習時間
- 総問題数
- 総語彙数
- mastered
- unsure
- forgotten

## 22. 学習ストリーク

連続学習日数を記録する。

例：

> 🔥 7日連続学習中

ただし、過度なゲーム化は避ける。

## 23. Questionデータ

```ts
type Question = {
  id: string

  sentence: string

  choices: {
    id: "A" | "B" | "C" | "D"
    text: string
  }[]

  correctChoice: "A" | "B" | "C" | "D"

  translationJP: string

  explanationJP: string

  choiceExplanations: {
    choice: "A" | "B" | "C" | "D"
    explanationJP: string
  }[]

  vocabulary: {
    word: string
    meaningJP: string
    partOfSpeech: string
    explanationJP?: string
  }[]

  grammar: {
    pattern: string
    meaningJP: string
    explanationJP: string
    example?: string
    exampleJP?: string
  }[]

  collocations?: {
    expression: string
    meaningJP: string
  }[]

  level: "A2"

  difficulty:
    | "easy"
    | "normal"
    | "hard"

  category: string

  targetVocabulary: string

  createdAt: string
}
```

## 24. GeneratorとValidator

- 問題生成時は `prompts/question-generator.md` のルールを必ず使用する。
- 生成後、`prompts/question-validator.md` を使用して問題を検証する。
- Validatorが `PASS` を返した問題のみ使用する。
- `FAIL` の場合は破棄してGeneratorへ戻す。

## 25. UI基本方針

デザインは：

- シンプル
- 清潔感
- 日本人向け
- 学習に集中しやすい
- スマートフォン対応
- Desktop対応

とする。

必要以上に装飾しない。

## 26. Quiz UI

問題画面では：

- 現在の問題番号
- 問題文
- A/B/C/D
- 進捗
- 次へ

を明確に表示する。

ユーザーが回答する前に正解を表示してはいけない。

## 27. 開発時の重要ルール

コードを書くとき：

- コンポーネントを適切に分割する
- 巨大な1ファイルを作らない
- 型を定義する
- 問題生成ロジックとUIを分離する
- 学習データと表示ロジックを分離する
- 再利用可能なコンポーネントを作る
- 将来的に問題数が数千問になっても対応できる設計にする

## 28. 最終ゴール

このプロジェクトの目的は単なるQuizアプリではない。

ユーザーが、

```
語彙を知る
    ↓
文章の中で意味を判断する
    ↓
間違いを理解する
    ↓
Flash Cardで復習する
    ↓
別の文脈で再び解く
```

という流れを繰り返すことで、**実際に使えるベトナム語語彙力を身につけられるWebアプリ**を作る。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
