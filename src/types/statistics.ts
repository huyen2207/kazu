// Learning History / Statistics types — CLAUDE.md セクション19・21・22参照

export type StudySession = {
  id: string;

  startedAt: string;
  finishedAt: string;

  questionCount: number;
  correctCount: number;
  wrongCount: number;

  accuracy: number;

  studiedVocabulary: string[];
  wrongVocabulary: string[];

  studyTimeSeconds: number;
};

// Dashboard表示用 — CLAUDE.md セクション21参照
export type TodayStats = {
  studyTimeSeconds: number;
  questionCount: number;
  accuracy: number;
  newVocabularyCount: number;
  reviewVocabularyCount: number;
};

export type WeeklyStats = {
  studyDays: number;
  questionCount: number;
  averageAccuracy: number;
  studyTimeSeconds: number;
  vocabularyCount: number;
};

export type TotalStats = {
  totalStudyTimeSeconds: number;
  totalQuestionCount: number;
  totalVocabularyCount: number;
  masteredCount: number;
  unsureCount: number;
  forgottenCount: number;
};

// 語彙ステータス集計 — prompts/vocabulary-manager.md セクション47参照
export type VocabularyStatistics = {
  totalVocabulary: number;
  new: number;
  learning: number;
  forgotten: number;
  unsure: number;
  reviewing: number;
  mastered: number;
  dueToday: number;
  learnedThisWeek: number;
};

export type DashboardStats = {
  today: TodayStats;
  last7Days: WeeklyStats;
  total: TotalStats;
  // 学習ストリーク — CLAUDE.md セクション22参照
  streakDays: number;
};
