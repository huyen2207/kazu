"use client";

// Flash Cardデッキ — 1枚ずつめくって評価する
// 評価はサーバーアクションで即座に保存され、SRSの次回復習日が更新される

import { useState, useTransition } from "react";
import Link from "next/link";

import type { VocabularyItemRow } from "../../db/schema";
import type { FlashCardAnswer } from "../../types/vocabulary";
import { rateFlashcardAction } from "../../app/flashcards/actions";
import { ConfusionCard } from "./ConfusionCard";
import { FlashCard } from "./FlashCard";
import { FlashCardControls } from "./FlashCardControls";

export type DeckCard = {
  item: VocabularyItemRow;
  bucketLabel: string;
  // この語彙と混同している語彙（回数が多い場合のみ）
  confusion?: { partner: VocabularyItemRow; count: number };
};

const ANSWER_LABELS: Record<FlashCardAnswer, string> = {
  forgotten: "覚えていない",
  unsure: "あやふや",
  remembered: "覚えた",
};

export function FlashcardDeck({ cards }: { cards: DeckCard[] }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<
    { item: VocabularyItemRow; answer: FlashCardAnswer }[]
  >([]);
  const [isPending, startTransition] = useTransition();

  if (cards.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
        <p className="text-gray-600">
          今日復習するカードはありません。まずはクイズで語彙を増やしましょう。
        </p>
        <Link
          href="/quiz"
          className="mt-4 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
        >
          クイズを始める
        </Link>
      </div>
    );
  }

  if (index >= cards.length) {
    const counts = {
      forgotten: results.filter((r) => r.answer === "forgotten").length,
      unsure: results.filter((r) => r.answer === "unsure").length,
      remembered: results.filter((r) => r.answer === "remembered").length,
    };
    return (
      <div className="space-y-5">
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
          <h2 className="text-lg font-bold">復習完了！</h2>
          <p className="mt-1 text-sm text-gray-600">
            {results.length}枚のカードを復習しました。次回の復習予定が更新されました。
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-md bg-red-50 py-3">
              <p className="text-xl font-bold text-red-700">
                {counts.forgotten}
              </p>
              <p className="text-red-700">覚えていない</p>
            </div>
            <div className="rounded-md bg-yellow-50 py-3">
              <p className="text-xl font-bold text-yellow-700">
                {counts.unsure}
              </p>
              <p className="text-yellow-700">あやふや</p>
            </div>
            <div className="rounded-md bg-green-50 py-3">
              <p className="text-xl font-bold text-green-700">
                {counts.remembered}
              </p>
              <p className="text-green-700">覚えた</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/review"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            復習リストを見る
          </Link>
          <Link
            href="/quiz?mode=review"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            Reviewクイズで確認
          </Link>
        </div>
      </div>
    );
  }

  const card = cards[index];

  const handleRate = (answer: FlashCardAnswer) => {
    if (isPending) return;
    startTransition(async () => {
      await rateFlashcardAction({
        vocabularyId: card.item.id,
        answer,
      });
      setResults((prev) => [...prev, { item: card.item, answer }]);
      setIndex((prev) => prev + 1);
      setFlipped(false);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          カード{" "}
          <span className="font-semibold text-gray-900">{index + 1}</span> /{" "}
          {cards.length}
        </span>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs">
          {card.bucketLabel}
        </span>
      </div>

      <FlashCard
        item={card.item}
        flipped={flipped}
        onFlip={() => setFlipped(!flipped)}
      />

      {flipped && card.confusion && (
        <ConfusionCard
          target={card.item}
          confused={card.confusion.partner}
          count={card.confusion.count}
        />
      )}

      {flipped ? (
        <FlashCardControls disabled={isPending} onRate={handleRate} />
      ) : (
        <p className="text-center text-xs text-gray-400">
          カードをタップして裏面を確認してから、
          {Object.values(ANSWER_LABELS).join(" / ")}を選んでください
        </p>
      )}
    </div>
  );
}
