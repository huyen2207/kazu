// Vocabulary Manager — prompts/vocabulary-manager.md の仕様に従う
//
// masteryScore・SRS・count更新などの決定論的処理は src/lib/ が担当する（セクション54）。
// このモジュールは「どの語彙を保存・Flash Cardに追加する価値があるか」の判定を担当する。
// （セクション6～8：すべての単語を自動登録してはいけない）

import type { Question } from "../../types/question";
import { normalizeVietnamese } from "../../lib/vocabularyNormalizer";

export type QuestionVocabularyEntry = Question["vocabulary"][number] & {
  example?: string;
  exampleJP?: string;
};

// Flash Cardに自動追加しない語彙（セクション8）：
// 人名・地名・数字・A1の超基本語
const EXCLUDED_BASIC_WORDS = new Set(
  [
    // 代名詞・超基本語（A1の非常に基本的な語）
    "tôi", "bạn", "anh", "chị", "em", "cô", "ông", "bà", "nó", "chúng ta",
    "chúng tôi", "họ", "mình",
    // 超基本動詞・機能語
    "là", "có", "không", "và", "nhưng", "nên", "phải", "rất", "quá", "lắm",
    "này", "kia", "đó", "gì", "ai", "đâu", "nào",
    // 数字
    "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín", "mười",
  ].map((w) => normalizeVietnamese(w)),
);

function isNumberWord(word: string): boolean {
  return /^[0-9]+$/.test(word.trim());
}

function isProperNoun(word: string): boolean {
  // 大文字始まりの固有名詞（Hà Nội、Nhậtなど）は自動追加しない
  const trimmed = word.trim();
  return /^[A-ZĐÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ]/.test(
    trimmed,
  );
}

export function isLearningValuable(word: string): boolean {
  const normalized = normalizeVietnamese(word);
  if (!normalized) return false;
  if (isNumberWord(normalized)) return false;
  if (EXCLUDED_BASIC_WORDS.has(normalized)) return false;
  if (isProperNoun(word)) return false;
  return true;
}

export type VocabularySelection = {
  entry: QuestionVocabularyEntry;
  isTarget: boolean;
  // Flash Card追加優先度（セクション7）：1=targetVocabulary、2=間違いの原因語、3=その他の学習価値語
  priority: 1 | 2 | 3;
};

/**
 * 問題から保存・Flash Card追加する語彙を選定する（セクション6・7・19）。
 * - Priority 1：targetVocabulary（必ず含める）
 * - Priority 2：ユーザーが間違えた原因になった語（選んだ選択肢の語）
 * - Priority 3：その他の学習価値の高い語（2～5個程度に制限）
 */
export function selectVocabularyToSave(
  question: Pick<Question, "vocabulary" | "targetVocabulary">,
  options: { selectedChoiceText?: string; isCorrect: boolean },
): VocabularySelection[] {
  const selections: VocabularySelection[] = [];
  const seen = new Set<string>();

  const push = (
    entry: QuestionVocabularyEntry,
    isTarget: boolean,
    priority: 1 | 2 | 3,
  ) => {
    const key = normalizeVietnamese(entry.word);
    if (seen.has(key)) return;
    seen.add(key);
    selections.push({ entry, isTarget, priority });
  };

  const findEntry = (word: string) =>
    question.vocabulary.find(
      (v) => normalizeVietnamese(v.word) === normalizeVietnamese(word),
    );

  // Priority 1：targetVocabulary
  const targetEntry = findEntry(question.targetVocabulary);
  push(
    targetEntry ?? {
      word: question.targetVocabulary,
      meaningJP: "",
      partOfSpeech: "",
    },
    true,
    1,
  );

  // Priority 2：間違えた場合、ユーザーが選んだ語（混同の原因語）
  if (!options.isCorrect && options.selectedChoiceText) {
    const confusedEntry = findEntry(options.selectedChoiceText);
    if (confusedEntry && isLearningValuable(confusedEntry.word)) {
      push(confusedEntry, false, 2);
    }
  }

  // Priority 3：残りの学習価値の高い語（合計5個まで）
  for (const entry of question.vocabulary) {
    if (selections.length >= 5) break;
    if (isLearningValuable(entry.word)) {
      push(entry, false, 3);
    }
  }

  return selections;
}
