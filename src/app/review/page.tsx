// Reviewページ — 今日復習すべき語彙を優先順位付きで表示する
// 優先順位：overdue → forgotten → repeated mistakes → unsure → reviewing → masteredの長期確認

import Link from "next/link";

import {
  getTodayReviewList,
  REVIEW_BUCKET_LABELS,
  type ReviewBucket,
} from "../../services/reviewService";

export const dynamic = "force-dynamic";

const BUCKET_COLORS: Record<ReviewBucket, string> = {
  overdue: "border-red-300 bg-red-50 text-red-800",
  forgotten: "border-red-200 bg-red-50 text-red-700",
  repeatedMistakes: "border-orange-200 bg-orange-50 text-orange-700",
  unsure: "border-yellow-200 bg-yellow-50 text-yellow-700",
  reviewing: "border-purple-200 bg-purple-50 text-purple-700",
  masteredCheck: "border-green-200 bg-green-50 text-green-700",
};

export default async function ReviewPage() {
  const reviewList = getTodayReviewList(30);

  // バケットごとにグループ化して表示する
  const grouped = new Map<ReviewBucket, typeof reviewList>();
  for (const entry of reviewList) {
    const list = grouped.get(entry.bucket) ?? [];
    list.push(entry);
    grouped.set(entry.bucket, list);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">今日の復習</h1>
          <p className="mt-1 text-sm text-gray-600">
            SRSに基づく今日の復習候補（{reviewList.length}語）
          </p>
        </div>
        {reviewList.length > 0 && (
          <div className="flex gap-2">
            <Link
              href="/flashcards"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Flash Cardで復習
            </Link>
            <Link
              href="/quiz?mode=review"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              Reviewクイズ
            </Link>
          </div>
        )}
      </section>

      {reviewList.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
          <p className="text-gray-600">
            今日の復習はありません。クイズで新しい語彙を学びましょう。
          </p>
          <Link
            href="/quiz"
            className="mt-4 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
          >
            クイズを始める
          </Link>
        </div>
      ) : (
        [...grouped.entries()].map(([bucket, entries]) => (
          <section key={bucket}>
            <h2
              className={`inline-block rounded-full border px-3 py-0.5 text-xs font-semibold ${BUCKET_COLORS[bucket]}`}
            >
              {REVIEW_BUCKET_LABELS[bucket]}（{entries.length}）
            </h2>
            <ul className="mt-2 space-y-1.5">
              {entries.map(({ item }) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-2.5"
                >
                  <div>
                    <span className="font-semibold">{item.vietnamese}</span>
                    <span className="ml-2 text-sm text-gray-600">
                      {item.japaneseMeaning}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>優先度 {item.reviewPriority}</span>
                    <span className="hidden sm:inline">
                      間違い {item.quizWrongCount + item.flashcardWrongCount}回
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
