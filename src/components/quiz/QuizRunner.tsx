"use client";

// クイズ実行のクライアントコンポーネント
// 1問ずつ：回答 → 正誤 + 日本語解説 → 次へ → … → 結果画面
// 回答前に正解を表示しない（CLAUDE.md セクション26）
// 各回答はサーバーアクションで即座にDBへ記録し、語彙のstatus/SRSも更新される。

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";

import type { ChoiceId, Question, QuizMode } from "../../types/question";
import { finishQuizAction, submitAnswerAction } from "../../app/quiz/actions";
import { ChoiceButton, type ChoiceState } from "./ChoiceButton";
import { QuestionCard } from "./QuestionCard";
import { QuestionExplanation } from "./QuestionExplanation";
import { QuizProgress } from "./QuizProgress";

type AnswerRecord = {
  question: Question;
  selected: ChoiceId;
  isCorrect: boolean;
  answerId?: number;
};

const MODE_LABELS: Record<QuizMode, string> = {
  new: "New Vocabulary",
  review: "Review",
  weakPoints: "Weak Points",
  random: "Random",
};

export function QuizRunner({
  questions,
  mode,
}: {
  questions: Question[];
  mode: QuizMode;
}) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"answering" | "feedback" | "finished">(
    "answering",
  );
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [selected, setSelected] = useState<ChoiceId | null>(null);
  const [isPending, startTransition] = useTransition();

  const startedAtRef = useRef(new Date().toISOString());
  const questionShownAtRef = useRef(Date.now());
  const sessionSavedRef = useRef(false);

  // 全回答の記録が完了した時点で一度だけセッションを保存する
  useEffect(() => {
    if (
      phase !== "finished" ||
      isPending ||
      answers.length === 0 ||
      sessionSavedRef.current
    ) {
      return;
    }
    sessionSavedRef.current = true;
    const answerIds = answers
      .map((a) => a.answerId)
      .filter((id): id is number => id !== undefined);
    void finishQuizAction({
      startedAtIso: startedAtRef.current,
      answerIds,
      studiedVocabulary: answers.map((a) => a.question.targetVocabulary),
      wrongVocabulary: answers
        .filter((a) => !a.isCorrect)
        .map((a) => a.question.targetVocabulary),
    });
  }, [phase, isPending, answers]);

  const question = questions[index];
  const correctCount = answers.filter((a) => a.isCorrect).length;

  if (questions.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
        <p className="text-gray-600">
          出題できる問題がありません。しばらくしてからもう一度お試しください。
        </p>
        <Link
          href="/quiz"
          className="mt-4 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
        >
          クイズ設定に戻る
        </Link>
      </div>
    );
  }

  const handleSelect = (choiceId: ChoiceId) => {
    if (phase !== "answering" || isPending) return;
    setSelected(choiceId);

    const responseTimeSeconds =
      Math.round((Date.now() - questionShownAtRef.current) / 100) / 10;
    const isCorrect = choiceId === question.correctChoice;

    // 表示は即時に切り替え、記録はバックグラウンドで行う
    setPhase("feedback");
    startTransition(async () => {
      const result = await submitAnswerAction({
        questionId: question.id,
        selectedChoice: choiceId,
        responseTimeSeconds,
      });
      setAnswers((prev) => [
        ...prev,
        { question, selected: choiceId, isCorrect, answerId: result?.answerId },
      ]);
    });
  };

  const handleNext = () => {
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setSelected(null);
      setPhase("answering");
      questionShownAtRef.current = Date.now();
    } else {
      setPhase("finished");
    }
  };

  if (phase === "finished") {
    const wrong = answers.filter((a) => !a.isCorrect);
    return (
      <div className="space-y-5">
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
          <h2 className="text-lg font-bold">クイズ結果</h2>
          <p className="mt-3 text-4xl font-bold text-indigo-600">
            {correctCount}
            <span className="text-xl text-gray-500"> / {answers.length}</span>
          </p>
          <p className="mt-1 text-sm text-gray-600">
            正答率{" "}
            {answers.length > 0
              ? Math.round((correctCount / answers.length) * 100)
              : 0}
            %（{MODE_LABELS[mode]}モード）
          </p>
        </div>

        {wrong.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-500">
              間違えた語彙（復習候補に追加されました）
            </h3>
            <ul className="mt-2 space-y-1.5">
              {wrong.map((a) => (
                <li key={a.question.id} className="text-sm">
                  <span className="font-semibold text-red-700">
                    {a.question.targetVocabulary}
                  </span>
                  <span className="ml-2 text-gray-500">
                    あなたの回答：
                    {
                      a.question.choices.find((c) => c.id === a.selected)?.text
                    }
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Link
            href="/quiz"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            もう一度クイズ
          </Link>
          <Link
            href="/flashcards"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            Flash Cardで復習
          </Link>
          <Link
            href="/statistics"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            統計を見る
          </Link>
        </div>
      </div>
    );
  }

  const choiceState = (choiceId: ChoiceId): ChoiceState => {
    if (phase === "answering") return "default";
    if (choiceId === question.correctChoice) return "correct";
    if (choiceId === selected) return "wrong";
    return "dimmed";
  };

  return (
    <div className="space-y-4">
      <QuizProgress
        current={index + 1}
        total={questions.length}
        correctCount={correctCount}
      />

      <QuestionCard sentence={question.sentence} />

      <div className="space-y-2">
        {question.choices.map((choice) => (
          <ChoiceButton
            key={choice.id}
            choiceId={choice.id}
            text={choice.text}
            state={choiceState(choice.id)}
            disabled={phase !== "answering"}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {phase === "feedback" && selected && (
        <>
          <QuestionExplanation
            question={question}
            isCorrect={selected === question.correctChoice}
          />
          <button
            type="button"
            onClick={handleNext}
            className="w-full rounded-md bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            {index + 1 < questions.length ? "次の問題へ" : "結果を見る"}
          </button>
        </>
      )}
    </div>
  );
}
