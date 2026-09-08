// Vocabularyページのフィルター・検索・並び替え（vocabulary-manager.md セクション39～41）
// GETパラメータで状態を保持するサーバーコンポーネント

import Link from "next/link";

import type {
  VocabularyFilterKey,
  VocabularySortKey,
} from "../../services/vocabularyService";

const FILTERS: { key: VocabularyFilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "learning", label: "Learning" },
  { key: "forgotten", label: "Forgotten" },
  { key: "unsure", label: "Unsure" },
  { key: "reviewing", label: "Reviewing" },
  { key: "mastered", label: "Mastered" },
  { key: "dueToday", label: "Due Today" },
  { key: "fromWrongAnswers", label: "From Wrong Answers" },
];

const SORTS: { key: VocabularySortKey; label: string }[] = [
  { key: "recent", label: "最近追加" },
  { key: "priority", label: "復習優先度" },
  { key: "wrongCount", label: "間違い回数" },
  { key: "masteryScore", label: "習熟度" },
  { key: "alphabetical", label: "アルファベット順" },
  { key: "nextReview", label: "次回復習日" },
];

export function VocabularyFilter({
  filter,
  search,
  sort,
}: {
  filter: VocabularyFilterKey;
  search: string;
  sort: VocabularySortKey;
}) {
  const query = (overrides: Record<string, string>) => {
    const params = new URLSearchParams({ filter, sort, ...overrides });
    if (search) params.set("search", search);
    if (overrides.search === "") params.delete("search");
    return `/vocabulary?${params.toString()}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={query({ filter: f.key })}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              f.key === filter
                ? "border-indigo-500 bg-indigo-600 font-semibold text-white"
                : "border-gray-200 bg-white text-gray-600 hover:border-indigo-300"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <form
        action="/vocabulary"
        method="get"
        className="flex flex-wrap items-center gap-2"
      >
        <input type="hidden" name="filter" value={filter} />
        <input
          type="search"
          name="search"
          defaultValue={search}
          placeholder="ベトナム語・日本語・カテゴリー・品詞で検索"
          className="min-w-52 flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
        />
        <select
          name="sort"
          defaultValue={sort}
          className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          検索
        </button>
      </form>
    </div>
  );
}
