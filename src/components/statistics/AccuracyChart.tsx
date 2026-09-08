// 7日間の学習推移チャート（問題数バー + 正答率）
// 外部ライブラリを使わないシンプルなSVGチャート

import type { DailyStudyPoint } from "../../services/statisticsService";

export function AccuracyChart({ points }: { points: DailyStudyPoint[] }) {
  const maxQuestions = Math.max(1, ...points.map((p) => p.questionCount));

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-gray-500">7日間の学習推移</h2>
      <div className="mt-3 flex items-end justify-between gap-2">
        {points.map((point) => {
          const barHeight =
            point.questionCount > 0
              ? Math.max(8, (point.questionCount / maxQuestions) * 96)
              : 2;
          const label = `${Number(point.date.slice(5, 7))}/${Number(point.date.slice(8, 10))}`;
          return (
            <div
              key={point.date}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <span className="text-xs font-semibold text-indigo-700">
                {point.questionCount > 0
                  ? `${Math.round(point.accuracy * 100)}%`
                  : ""}
              </span>
              <div
                className={`w-full max-w-10 rounded-t ${
                  point.questionCount > 0 ? "bg-indigo-400" : "bg-gray-200"
                }`}
                style={{ height: `${barHeight}px` }}
                title={`${label}: ${point.questionCount}問`}
              />
              <span className="text-xs text-gray-500">{label}</span>
              <span className="text-[10px] text-gray-400">
                {point.questionCount}問
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
