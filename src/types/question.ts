// Question type — CLAUDE.md セクション23参照

export type ChoiceId = "A" | "B" | "C" | "D";

export type Difficulty = "easy" | "normal" | "hard";

export type Question = {
  id: string;

  sentence: string;

  choices: {
    id: ChoiceId;
    text: string;
  }[];

  correctChoice: ChoiceId;

  translationJP: string;

  explanationJP: string;

  choiceExplanations: {
    choice: ChoiceId;
    explanationJP: string;
  }[];

  vocabulary: {
    word: string;
    meaningJP: string;
    partOfSpeech: string;
    explanationJP?: string;
  }[];

  grammar: {
    pattern: string;
    meaningJP: string;
    explanationJP: string;
    example?: string;
    exampleJP?: string;
  }[];

  collocations?: {
    expression: string;
    meaningJP: string;
  }[];

  level: "A2";

  difficulty: Difficulty;

  category: string;

  targetVocabulary: string;

  createdAt: string;
};

// Quizモード — CLAUDE.md セクション6参照
export type QuizMode = "new" | "review" | "weakPoints" | "random";

// 1セットの問題数 — CLAUDE.md セクション5参照
export type QuizSetSize = 10 | 20 | 30;

// Validator結果 — prompts/question-validator.md 参照
export type ValidationIssue = {
  severity: "critical" | "major" | "minor";
  type: string;
  messageJP: string;
  suggestionJP?: string;
};

export type ValidationResult = {
  status: "PASS" | "FAIL";
  score: number;
  issues: ValidationIssue[];
  checks: {
    naturalVietnamese: boolean;
    singleCorrectAnswer: boolean;
    appropriateLevel: boolean;
    goodDistractors: boolean;
    enoughContext: boolean;
    translationCorrect: boolean;
    explanationCorrect: boolean;
    vocabularyCorrect: boolean;
    grammarCorrect: boolean;
    duplicate: boolean;
  };
};

// Generatorへ渡す重複防止コンテキスト — CLAUDE.md セクション9参照
export type GenerationContext = {
  previousQuestions: string[];
  recentlyUsedVocabulary: string[];
  recentlyUsedGrammar: string[];
  recentlyUsedTopics: string[];
  weakVocabulary: string[];
  weakGrammar: string[];
  masteredVocabulary: string[];
};
