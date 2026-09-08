"use client";

// Flash Card評価ボタン（CLAUDE.md セクション16）
// 覚えていない → forgotten / あやふや → unsure / 覚えた → reviewing（条件を満たせばmastered）

import type { FlashCardAnswer } from "../../types/vocabulary";

const BUTTONS: {
  answer: FlashCardAnswer;
  label: string;
  className: string;
}[] = [
  {
    answer: "forgotten",
    label: "覚えていない",
    className: "border-red-300 bg-red-50 text-red-700 hover:bg-red-100",
  },
  {
    answer: "unsure",
    label: "あやふや",
    className:
      "border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100",
  },
  {
    answer: "remembered",
    label: "覚えた",
    className: "border-green-300 bg-green-50 text-green-700 hover:bg-green-100",
  },
];

export function FlashCardControls({
  disabled,
  onRate,
}: {
  disabled: boolean;
  onRate: (answer: FlashCardAnswer) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {BUTTONS.map((button) => (
        <button
          key={button.answer}
          type="button"
          disabled={disabled}
          onClick={() => onRate(button.answer)}
          className={`rounded-lg border-2 px-3 py-3 text-sm font-semibold transition disabled:opacity-50 ${button.className}`}
        >
          {button.label}
        </button>
      ))}
    </div>
  );
}
