// Quizページ — モード・問題数の選択、またはクイズの実行
// モード：New / Review / Weak Points / Random（CLAUDE.md セクション6）
// 問題数：5 / 10 / 20 / 30

import Link from "next/link";

import type { QuizMode } from "../../types/question";
import { prepareQuiz } from "../../services/quizService";
import { QuizRunner } from "../../components/quiz/QuizRunner";

export const dynamic = "force-dynamic";

const MODES: { key: QuizMode; title: string; description: string }[] = [
  {
    key: "new",
    title: "New Vocabulary",
    description: "まだ十分に学習していない新しい語彙を中心に出題",
  },
  {
    key: "review",
    title: "Review",
    description: "過去に間違えた語彙・あやふやな語彙を中心に出題",
  },
  {
    key: "weakPoints",
    title: "Weak Points",
    description: "正答率の低い語彙を優先して出題",
  },
  {
    key: "random",
    title: "Random",
    description: "新規語彙と復習語彙をバランスよく混ぜて出題",
  },
];

const COUNTS = [5, 10, 20, 30];

function isQuizMode(value: string | undefined): value is QuizMode {
  return (
    value === "new" ||
    value === "review" ||
    value === "weakPoints" ||
    value === "random"
  );
}

export default async function QuizPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const modeParam = typeof params.mode === "string" ? params.mode : undefined;
  const countParam = Number(
    typeof params.count === "string" ? params.count : "0",
  );

  // モード・問題数が指定済み → クイズを開始
  if (isQuizMode(modeParam) && COUNTS.includes(countParam)) {
    const questions = await prepareQuiz(modeParam, countParam);
    return (
      <div className="mx-auto max-w-2xl">
        <QuizRunner questions={questions} mode={modeParam} />
      </div>
    );
  }

  // 設定画面
  const selectedMode = isQuizMode(modeParam) ? modeParam : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section>
        <h1 className="text-2xl font-bold">クイズ</h1>
        <p className="mt-1 text-sm text-gray-600">
          モードと問題数を選んでスタート。文脈から最も適切な語彙を選ぶ4択問題です。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-500">モードを選択</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {MODES.map((mode) => (
            <Link
              key={mode.key}
              href={`/quiz?mode=${mode.key}`}
              className={`rounded-lg border-2 p-4 transition ${
                selectedMode === mode.key
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 bg-white hover:border-indigo-300"
              }`}
            >
              <h3 className="font-semibold">{mode.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{mode.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {selectedMode && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-500">問題数を選択</h2>
          <div className="grid grid-cols-4 gap-3">
            {COUNTS.map((count) => (
              <Link
                key={count}
                href={`/quiz?mode=${selectedMode}&count=${count}`}
                className="rounded-lg border-2 border-gray-200 bg-white py-4 text-center text-lg font-bold transition hover:border-indigo-400 hover:bg-indigo-50"
              >
                {count}
                <span className="block text-xs font-normal text-gray-500">
                  問
                </span>
              </Link>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            ※ 問題はValidator検証をPASSしたもののみ出題されます。
          </p>
        </section>
      )}
    </div>
  );
}
