"use client";

// Flash Card本体（CLAUDE.md セクション15）
// 表面：ベトナム語・品詞 / 裏面：日本語意味・説明・例文・日本語訳・コロケーション・類義語・反対語

import type { VocabularyItemRow } from "../../db/schema";

export function FlashCard({
  item,
  flipped,
  onFlip,
}: {
  item: VocabularyItemRow;
  flipped: boolean;
  onFlip: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onFlip}
      className="block w-full cursor-pointer rounded-xl border-2 border-gray-200 bg-white p-6 text-left transition hover:border-indigo-300"
    >
      {!flipped ? (
        <div className="flex min-h-48 flex-col items-center justify-center gap-2">
          <p className="text-3xl font-bold text-gray-900">{item.vietnamese}</p>
          {item.partOfSpeech && (
            <p className="text-sm text-gray-500">〔{item.partOfSpeech}〕</p>
          )}
          <p className="mt-4 text-xs text-gray-400">
            タップして意味を表示
          </p>
        </div>
      ) : (
        <div className="min-h-48 space-y-3">
          <div className="flex items-baseline gap-2">
            <p className="text-xl font-bold text-indigo-700">
              {item.vietnamese}
            </p>
            {item.partOfSpeech && (
              <span className="text-xs text-gray-500">
                〔{item.partOfSpeech}〕
              </span>
            )}
          </div>

          <p className="text-lg font-semibold">{item.japaneseMeaning}</p>

          {item.exampleSentence && (
            <div className="rounded-md bg-gray-50 px-3 py-2 text-sm">
              <p className="leading-relaxed">{item.exampleSentence}</p>
              {item.exampleJapanese && (
                <p className="mt-0.5 text-gray-600">{item.exampleJapanese}</p>
              )}
            </div>
          )}

          {item.collocations && item.collocations.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500">
                コロケーション
              </p>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {item.collocations.map((c) => (
                  <li
                    key={c.expression}
                    className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs text-indigo-800"
                  >
                    {c.expression}＝{c.meaningJP}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-4 text-xs text-gray-600">
            {item.synonyms && item.synonyms.length > 0 && (
              <p>
                <span className="font-semibold">類義語：</span>
                {item.synonyms.join("、")}
              </p>
            )}
            {item.antonyms && item.antonyms.length > 0 && (
              <p>
                <span className="font-semibold">反対語：</span>
                {item.antonyms.join("、")}
              </p>
            )}
          </div>
        </div>
      )}
    </button>
  );
}
