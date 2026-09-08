// クイズの進捗表示（CLAUDE.md セクション26：現在の問題番号と進捗を明確に）

export function QuizProgress({
  current,
  total,
  correctCount,
}: {
  current: number; // 1始まり
  total: number;
  correctCount: number;
}) {
  const percent = Math.round(((current - 1) / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          問題 <span className="font-semibold text-gray-900">{current}</span> /{" "}
          {total}
        </span>
        <span>正解 {correctCount}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
