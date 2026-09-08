// Dashboard統計カード（CLAUDE.md セクション21）

import type { DashboardStats } from "../../types/statistics";

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分`;
  return `${Math.floor(minutes / 60)}時間${minutes % 60}分`;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="mt-0.5 text-xs text-gray-500">{label}</p>
    </div>
  );
}

export function StudyStats({ stats }: { stats: DashboardStats }) {
  return (
    <div className="space-y-4">
      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-500">Today</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <StatCard
            label="学習時間"
            value={formatDuration(stats.today.studyTimeSeconds)}
          />
          <StatCard label="問題数" value={`${stats.today.questionCount}問`} />
          <StatCard
            label="正解率"
            value={
              stats.today.questionCount > 0
                ? `${Math.round(stats.today.accuracy * 100)}%`
                : "—"
            }
          />
          <StatCard
            label="新規語彙"
            value={`${stats.today.newVocabularyCount}語`}
          />
          <StatCard
            label="復習語彙"
            value={`${stats.today.reviewVocabularyCount}語`}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-500">
          Last 7 Days
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <StatCard label="学習日数" value={`${stats.last7Days.studyDays}日`} />
          <StatCard
            label="問題数"
            value={`${stats.last7Days.questionCount}問`}
          />
          <StatCard
            label="平均正答率"
            value={
              stats.last7Days.questionCount > 0
                ? `${Math.round(stats.last7Days.averageAccuracy * 100)}%`
                : "—"
            }
          />
          <StatCard
            label="学習時間"
            value={formatDuration(stats.last7Days.studyTimeSeconds)}
          />
          <StatCard
            label="学習語彙"
            value={`${stats.last7Days.vocabularyCount}語`}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-500">Total</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
          <StatCard
            label="総学習時間"
            value={formatDuration(stats.total.totalStudyTimeSeconds)}
          />
          <StatCard
            label="総問題数"
            value={`${stats.total.totalQuestionCount}問`}
          />
          <StatCard
            label="総語彙数"
            value={`${stats.total.totalVocabularyCount}語`}
          />
          <StatCard label="Mastered" value={`${stats.total.masteredCount}語`} />
          <StatCard label="Unsure" value={`${stats.total.unsureCount}語`} />
          <StatCard
            label="Forgotten"
            value={`${stats.total.forgottenCount}語`}
          />
        </div>
      </section>
    </div>
  );
}
