// 語彙の統計 — status分布・Due Today・最も間違えた語彙・最も混同した語彙
// CLAUDE.md実装指示14、vocabulary-manager.md セクション47・48参照

import type { VocabularyItemRow } from "../../db/schema";
import type { VocabularyStatistics } from "../../types/statistics";
import type { ConfusionPairView } from "../../services/reviewService";

const STATUS_ITEMS: {
  key: keyof Pick<
    VocabularyStatistics,
    "new" | "learning" | "forgotten" | "unsure" | "reviewing" | "mastered"
  >;
  label: string;
  color: string;
}[] = [
  { key: "new", label: "New", color: "bg-blue-400" },
  { key: "learning", label: "Learning", color: "bg-indigo-400" },
  { key: "forgotten", label: "Forgotten", color: "bg-red-400" },
  { key: "unsure", label: "Unsure", color: "bg-yellow-400" },
  { key: "reviewing", label: "Reviewing", color: "bg-purple-400" },
  { key: "mastered", label: "Mastered", color: "bg-green-500" },
];

export function VocabularyStats({
  stats,
  dueToday,
  mostWrong,
  mostConfused,
}: {
  stats: VocabularyStatistics;
  dueToday: number;
  mostWrong: VocabularyItemRow[];
  mostConfused: ConfusionPairView[];
}) {
  const total = Math.max(1, stats.totalVocabulary);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-500">
            語彙の定着状況（全{stats.totalVocabulary}語）
          </h2>
          <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
            Due Today：{dueToday}語
          </span>
        </div>

        <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
          {STATUS_ITEMS.map((s) => (
            <div
              key={s.key}
              className={s.color}
              style={{ width: `${(stats[s.key] / total) * 100}%` }}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
          {STATUS_ITEMS.map((s) => (
            <span key={s.key} className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${s.color}`} />
              {s.label} {stats[s.key]}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-500">
            最も間違えた語彙
          </h2>
          {mostWrong.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">まだ記録がありません。</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {mostWrong.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    <span className="font-semibold">{item.vietnamese}</span>
                    <span className="ml-2 text-gray-500">
                      {item.japaneseMeaning}
                    </span>
                  </span>
                  <span className="text-xs text-red-600">
                    {item.quizWrongCount + item.flashcardWrongCount}回
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-500">
            最も混同した語彙ペア
          </h2>
          {mostConfused.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">まだ記録がありません。</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {mostConfused.map((pair) => (
                <li
                  key={`${pair.target.id}-${pair.confused.id}`}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-semibold">
                    {pair.target.vietnamese}
                    <span className="mx-1.5 font-normal text-gray-400">↔</span>
                    {pair.confused.vietnamese}
                  </span>
                  <span className="text-xs text-orange-600">
                    {pair.count}回
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
