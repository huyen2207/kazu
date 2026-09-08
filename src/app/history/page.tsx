// Learning Historyページ — 過去の学習セッション一覧（CLAUDE.md セクション19）

import { getRecentSessions } from "../../services/statisticsService";

export const dynamic = "force-dynamic";

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`;
  return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
}

export default async function HistoryPage() {
  const sessions = getRecentSessions(50);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section>
        <h1 className="text-2xl font-bold">学習履歴</h1>
        <p className="mt-1 text-sm text-gray-600">
          過去のクイズセッションの記録
        </p>
      </section>

      {sessions.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
          まだ学習履歴がありません。クイズを完了すると記録されます。
        </div>
      ) : (
        <ul className="space-y-3">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  {formatDateTime(session.startedAt)}
                </p>
                <p className="text-sm">
                  <span className="font-bold text-indigo-600">
                    {session.correctCount}
                  </span>
                  <span className="text-gray-500">
                    {" "}
                    / {session.questionCount}問正解（
                    {Math.round(session.accuracy * 100)}%）
                  </span>
                </p>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                <span>学習時間 {formatDuration(session.studyTimeSeconds)}</span>
                <span>学習語彙 {session.studiedVocabulary.length}語</span>
                {session.wrongVocabulary.length > 0 && (
                  <span className="text-red-600">
                    間違い：{session.wrongVocabulary.join("、")}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
