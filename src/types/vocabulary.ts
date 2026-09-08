// Vocabulary types — prompts/vocabulary-manager.md を正とする（セクション2・4・35・45参照）

export type VocabularyStatus =
  | "new"
  | "learning"
  | "forgotten"
  | "unsure"
  | "reviewing"
  | "mastered";

export type VocabularyLevel = "A1" | "A2";

export type VocabularyItem = {
  id: string;

  vietnamese: string;
  // 重複登録防止用（小文字化・空白除去。声調記号は削除しない）— セクション5参照
  normalizedVietnamese: string;

  japaneseMeaning: string;
  partOfSpeech: string;

  level: VocabularyLevel;
  category: string;

  exampleSentence?: string;
  exampleJapanese?: string;

  collocations?: {
    expression: string;
    meaningJP: string;
  }[];

  synonyms?: string[];
  antonyms?: string[];

  status: VocabularyStatus;

  exposureCount: number;

  quizCorrectCount: number;
  quizWrongCount: number;

  flashcardCorrectCount: number;
  flashcardWrongCount: number;

  consecutiveCorrect: number;
  consecutiveWrong: number;

  // 0～100 — セクション15～17参照
  masteryScore: number;

  firstSeenAt: string;
  lastSeenAt?: string;
  lastReviewedAt?: string;
  nextReviewAt?: string;

  sourceQuestionIds: string[];

  // 0～100、高いほど今日復習すべき — セクション22参照
  reviewPriority: number;
};

// 後方互換用エイリアス
export type Vocabulary = VocabularyItem;

// Flash Cardでのユーザー操作 — セクション11参照
// 「覚えた」(remembered) を選んでも即masteredにはしない
export type FlashCardAnswer = "forgotten" | "unsure" | "remembered";

// Flash Cardの種類 — セクション37参照
export type FlashCardType = "meaning" | "reverse" | "example" | "confusion";

// 混同ペアの記録 — セクション34・35参照
export type VocabularyConfusion = {
  targetVocabularyId: string;
  confusedVocabularyId: string;

  count: number;

  lastOccurredAt: string;
};

// 多義語のsense単位管理（例：đường = 道 / 砂糖）— セクション44・45参照
export type VocabularySense = {
  senseId: string;

  vocabularyId: string;

  meaningJP: string;

  partOfSpeech: string;

  exampleSentence: string;

  category?: string;
};
