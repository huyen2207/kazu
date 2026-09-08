// Statistics / Dashboardページ（CLAUDE.md セクション21・22、実装指示14）

import {
  getDashboardStats,
  getDueTodayCount,
  getLast7DaysTrend,
  getMostConfusedPairs,
  getMostWrongVocabulary,
  getVocabularyStatusStats,
} from "../../services/statisticsService";
import { AccuracyChart } from "../../components/statistics/AccuracyChart";
import { StudyStats } from "../../components/statistics/StudyStats";
import { VocabularyStats } from "../../components/statistics/VocabularyStats";

export const dynamic = "force-dynamic";

export default async function StatisticsPage() {
  const stats = getDashboardStats();
  const trend = getLast7DaysTrend();
  const vocabStats = getVocabularyStatusStats();
  const dueToday = getDueTodayCount();
  const mostWrong = getMostWrongVocabulary(5);
  const mostConfused = getMostConfusedPairs(5);

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">統計</h1>
          <p className="mt-1 text-sm text-gray-600">
            学習時間・正答率・語彙の定着状況
          </p>
        </div>
        {stats.streakDays > 0 && (
          <p className="rounded-full bg-orange-50 px-4 py-1.5 text-sm font-semibold text-orange-700">
            🔥 {stats.streakDays}日連続学習中
          </p>
        )}
      </section>

      <StudyStats stats={stats} />
      <AccuracyChart points={trend} />
      <VocabularyStats
        stats={vocabStats}
        dueToday={dueToday}
        mostWrong={mostWrong}
        mostConfused={mostConfused}
      />
    </div>
  );
}
