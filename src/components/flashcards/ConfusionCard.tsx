// 比較Flash Card（vocabulary-manager.md セクション36）
// 混同回数の多い語彙ペアを並べて違いを確認する

import type { VocabularyItemRow } from "../../db/schema";

export function ConfusionCard({
  target,
  confused,
  count,
}: {
  target: VocabularyItemRow;
  confused: VocabularyItemRow;
  count: number;
}) {
  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
      <p className="text-xs font-semibold text-orange-700">
        混同注意（{count}回間違えています）
      </p>
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[target, confused].map((item) => (
          <div key={item.id} className="rounded-md bg-white p-3">
            <p className="font-bold text-gray-900">
              {item.vietnamese}
              {item.partOfSpeech && (
                <span className="ml-1.5 text-xs font-normal text-gray-500">
                  〔{item.partOfSpeech}〕
                </span>
              )}
            </p>
            <p className="mt-0.5 text-sm">{item.japaneseMeaning}</p>
            {item.exampleSentence && (
              <p className="mt-1.5 text-xs leading-relaxed text-gray-600">
                {item.exampleSentence}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
