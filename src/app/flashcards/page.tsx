// Flash Cardページ — 今日の復習対象をSRS優先順で出題する
// 表面：ベトナム語・品詞 / 裏面：意味・例文・コロケーションなど（CLAUDE.md セクション15）

import Link from "next/link";

import { getTodayReviewList, getTopConfusionPairs, REVIEW_BUCKET_LABELS } from "../../services/reviewService";
import { FlashcardDeck, type DeckCard } from "../../components/flashcards/FlashcardDeck";

export const dynamic = "force-dynamic";

const COUNTS = [5, 10, 20, 30];

export default async function FlashcardsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const countParam = Number(
    typeof params.count === "string" ? params.count : "10",
  );
  const count = COUNTS.includes(countParam) ? countParam : 10;

  const reviewList = getTodayReviewList(count);

  // 混同回数2回以上のペアを比較カードとして表示する（vocabulary-manager.md セクション36）
  const confusionPairs = getTopConfusionPairs(20).filter((p) => p.count >= 2);
  const confusionByVocabId = new Map(
    confusionPairs.map((p) => [
      p.target.id,
      { partner: p.confused, count: p.count },
    ]),
  );

  const cards: DeckCard[] = reviewList.map(({ item, bucket }) => ({
    item,
    bucketLabel: REVIEW_BUCKET_LABELS[bucket],
    confusion: confusionByVocabId.get(item.id),
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">フラッシュカード</h1>
          <p className="mt-1 text-sm text-gray-600">
            覚えていない・あやふやな語彙から優先的に復習します。
          </p>
        </div>
        <div className="flex gap-1.5 text-xs">
          {COUNTS.map((c) => (
            <Link
              key={c}
              href={`/flashcards?count=${c}`}
              className={`rounded-md border px-2.5 py-1 ${
                c === count
                  ? "border-indigo-500 bg-indigo-50 font-semibold text-indigo-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-indigo-300"
              }`}
            >
              {c}枚
            </Link>
          ))}
        </div>
      </section>

      <FlashcardDeck cards={cards} />
    </div>
  );
}
