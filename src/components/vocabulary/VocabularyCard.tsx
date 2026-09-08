"use client";

// 語彙カード — 一覧表示用。status・習熟度・学習履歴の要約と手動status変更を提供する

import { useTransition } from "react";

import type { VocabularyItemRow } from "../../db/schema";
import type { FlashCardAnswer, VocabularyStatus } from "../../types/vocabulary";
import { setManualStatusAction } from "../../app/vocabulary/actions";

export const STATUS_LABELS: Record<VocabularyStatus, string> = {
  new: "New",
  learning: "Learning",
  forgotten: "Forgotten",
  unsure: "Unsure",
  reviewing: "Reviewing",
  mastered: "Mastered",
};

const STATUS_BADGES: Record<VocabularyStatus, string> = {
  new: "bg-blue-50 text-blue-700",
  learning: "bg-indigo-50 text-indigo-700",
  forgotten: "bg-red-50 text-red-700",
  unsure: "bg-yellow-50 text-yellow-700",
  reviewing: "bg-purple-50 text-purple-700",
  mastered: "bg-green-50 text-green-700",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

export function VocabularyCard({ item }: { item: VocabularyItemRow }) {
  const [isPending, startTransition] = useTransition();

  const handleManualStatus = (answer: FlashCardAnswer) => {
    startTransition(async () => {
      await setManualStatusAction({ vocabularyId: item.id, answer });
    });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-bold text-gray-900">
            {item.vietnamese}
            {item.partOfSpeech && (
              <span className="ml-1.5 text-xs font-normal text-gray-500">
                〔{item.partOfSpeech}〕
              </span>
            )}
          </p>
          <p className="mt-0.5 text-sm">{item.japaneseMeaning}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGES[item.status]}`}
        >
          {STATUS_LABELS[item.status]}
        </span>
      </div>

      {item.exampleSentence && (
        <p className="mt-2 text-xs leading-relaxed text-gray-600">
          {item.exampleSentence}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full ${
              item.masteryScore >= 80
                ? "bg-green-500"
                : item.masteryScore >= 40
                  ? "bg-yellow-500"
                  : "bg-red-400"
            }`}
            style={{ width: `${item.masteryScore}%` }}
          />
        </div>
        <span className="text-xs text-gray-500">{item.masteryScore}</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
        <span>
          Quiz {item.quizCorrectCount}◯ {item.quizWrongCount}✕
        </span>
        <span>
          Card {item.flashcardCorrectCount}◯ {item.flashcardWrongCount}✕
        </span>
        <span>次回復習：{formatDate(item.nextReviewAt)}</span>
        <span>{item.category}</span>
      </div>

      <div className="mt-3 flex gap-1.5">
        {(
          [
            ["forgotten", "覚えていない"],
            ["unsure", "あやふや"],
            ["remembered", "覚えた"],
          ] as const
        ).map(([answer, label]) => (
          <button
            key={answer}
            type="button"
            disabled={isPending}
            onClick={() => handleManualStatus(answer)}
            className="rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-600 transition hover:border-indigo-400 hover:text-indigo-700 disabled:opacity-50"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
