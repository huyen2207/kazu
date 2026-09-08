"use client";

// 4択の選択肢ボタン
// 回答前は正解を一切表示しない（CLAUDE.md セクション26）

import type { ChoiceId } from "../../types/question";

export type ChoiceState = "default" | "selected" | "correct" | "wrong" | "dimmed";

const STATE_CLASSES: Record<ChoiceState, string> = {
  default:
    "border-gray-200 bg-white hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer",
  selected: "border-indigo-500 bg-indigo-50",
  correct: "border-green-500 bg-green-50",
  wrong: "border-red-500 bg-red-50",
  dimmed: "border-gray-200 bg-gray-50 opacity-60",
};

export function ChoiceButton({
  choiceId,
  text,
  state,
  disabled,
  onSelect,
}: {
  choiceId: ChoiceId;
  text: string;
  state: ChoiceState;
  disabled: boolean;
  onSelect: (choiceId: ChoiceId) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(choiceId)}
      className={`flex w-full items-center gap-3 rounded-lg border-2 px-4 py-3 text-left transition ${STATE_CLASSES[state]}`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          state === "correct"
            ? "bg-green-500 text-white"
            : state === "wrong"
              ? "bg-red-500 text-white"
              : "bg-gray-100 text-gray-700"
        }`}
      >
        {choiceId}
      </span>
      <span className="text-base">{text}</span>
      {state === "correct" && (
        <span className="ml-auto text-sm font-semibold text-green-700">正解</span>
      )}
      {state === "wrong" && (
        <span className="ml-auto text-sm font-semibold text-red-700">不正解</span>
      )}
    </button>
  );
}
