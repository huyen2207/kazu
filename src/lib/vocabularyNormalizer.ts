// 語彙の正規化 — prompts/vocabulary-manager.md セクション5参照
//
// 同じ語彙の重複登録を防ぐため、比較・検索用のキーを作る。
// 重要：ベトナム語の声調記号は削除しない（sắp xếp ≠ sap xep）。

/**
 * 比較・検索用のnormalizedVietnameseを生成する。
 * - 前後の空白を削除
 * - 連続する空白を1つにまとめる
 * - 小文字化（Unicode対応。声調記号は保持される）
 * - 単語の一部でない記号（引用符・句読点など）を除去
 */
export function normalizeVietnamese(input: string): string {
  return input
    .normalize("NFC")
    .trim()
    .toLocaleLowerCase("vi")
    .replace(/[.,!?;:"'()\[\]{}«»“”‘’…]/g, "")
    .replace(/\s+/g, " ");
}

/** 2つの語彙が同一語として扱えるか（正規化後の完全一致） */
export function isSameVocabulary(a: string, b: string): boolean {
  return normalizeVietnamese(a) === normalizeVietnamese(b);
}

/**
 * 文をトークン（単語）に分割する。duplicateDetectorなどで使用。
 * 空欄プレースホルダ（______）は除外する。
 */
export function tokenizeVietnamese(sentence: string): string[] {
  return normalizeVietnamese(sentence)
    .split(" ")
    .filter((token) => token.length > 0 && !/^_+$/.test(token));
}
