// Vocabularyページ — 学習した語彙の一覧・フィルター・検索・並び替え
// vocabulary-manager.md セクション39～41参照

import {
  searchVocabulary,
  type VocabularyFilterKey,
  type VocabularySortKey,
} from "../../services/vocabularyService";
import { VocabularyFilter } from "../../components/vocabulary/VocabularyFilter";
import { VocabularyList } from "../../components/vocabulary/VocabularyList";

export const dynamic = "force-dynamic";

const FILTER_KEYS: VocabularyFilterKey[] = [
  "all",
  "new",
  "learning",
  "forgotten",
  "unsure",
  "reviewing",
  "mastered",
  "dueToday",
  "fromWrongAnswers",
];
const SORT_KEYS: VocabularySortKey[] = [
  "recent",
  "priority",
  "wrongCount",
  "masteryScore",
  "alphabetical",
  "nextReview",
];

export default async function VocabularyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filterParam =
    typeof params.filter === "string" ? params.filter : "all";
  const sortParam = typeof params.sort === "string" ? params.sort : "recent";
  const search = typeof params.search === "string" ? params.search : "";

  const filter = FILTER_KEYS.includes(filterParam as VocabularyFilterKey)
    ? (filterParam as VocabularyFilterKey)
    : "all";
  const sort = SORT_KEYS.includes(sortParam as VocabularySortKey)
    ? (sortParam as VocabularySortKey)
    : "recent";

  const items = searchVocabulary({ filter, search, sort });

  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-2xl font-bold">単語帳</h1>
        <p className="mt-1 text-sm text-gray-600">
          クイズで学習した語彙が自動的に登録されます（{items.length}語）。
        </p>
      </section>

      <VocabularyFilter filter={filter} search={search} sort={sort} />
      <VocabularyList items={items} />
    </div>
  );
}
