// Home — 今日の学習状況とクイズ / Flash Card復習の開始
// 表示項目：今日の学習時間・問題数・正答率・復習語彙数・学習ストリーク（実装指示1）

import Link from "next/link";

import { getDashboardStats, getDueTodayCount } from "../services/statisticsService";

export const dynamic = "force-dynamic";

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分`;
  return `${Math.floor(minutes / 60)}時間${minutes % 60}分`;
}

const menu = [
  { href: "/vocabulary", title: "単語帳", description: "語彙の一覧・検索・フィルター" },
  { href: "/review", title: "今日の復習", description: "SRSに基づく復習リスト" },
  { href: "/history", title: "学習履歴", description: "過去のセッション記録" },
  { href: "/statistics", title: "統計", description: "学習時間・正答率・定着状況" },
];

export default async function HomePage() {
  const stats = getDashboardStats();
  const dueToday = getDueTodayCount();

  const todayCards = [
    {
      label: "今日の学習時間",
      value: formatDuration(stats.today.studyTimeSeconds),
    },
    { label: "今日の問題数", value: `${stats.today.questionCount}問` },
    {
      label: "今日の正答率",
      value:
        stats.today.questionCount > 0
          ? `${Math.round(stats.today.accuracy * 100)}%`
          : "—",
    },
    { label: "今日の復習語彙", value: `${stats.today.reviewVocabularyCount}語` },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">ベトナム語 語彙トレーニング</h1>
          <p className="mt-1 text-sm text-gray-600">
            問題を解く → 解説を読む → Flash Cardで復習 → 別の文脈で確認する
          </p>
        </div>
        {stats.streakDays > 0 && (
          <p className="rounded-full bg-orange-50 px-4 py-1.5 text-sm font-semibold text-orange-700">
            🔥 {stats.streakDays}日連続学習中
          </p>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {todayCards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-gray-200 bg-white p-4 text-center"
          >
            <p className="text-xl font-bold text-gray-900">{card.value}</p>
            <p className="mt-0.5 text-xs text-gray-500">{card.label}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/quiz"
          className="rounded-xl bg-indigo-600 p-6 text-white transition hover:bg-indigo-700"
        >
          <h2 className="text-lg font-bold">クイズを始める</h2>
          <p className="mt-1 text-sm text-indigo-100">
            文脈から語彙を判断する4択問題（New / Review / Weak Points / Random）
          </p>
        </Link>
        <Link
          href="/flashcards"
          className="rounded-xl bg-emerald-600 p-6 text-white transition hover:bg-emerald-700"
        >
          <h2 className="text-lg font-bold">Flash Card復習を始める</h2>
          <p className="mt-1 text-sm text-emerald-100">
            {dueToday > 0
              ? `今日の復習対象：${dueToday}語`
              : "今日の復習対象はありません"}
          </p>
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {menu.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg border border-gray-200 bg-white p-4 transition hover:border-gray-400"
          >
            <h2 className="font-semibold">{item.title}</h2>
            <p className="mt-1 text-sm text-gray-600">{item.description}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
