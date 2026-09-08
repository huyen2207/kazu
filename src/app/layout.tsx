import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "KAZU — ベトナム語学習",
  description:
    "日本人向けベトナム語学習アプリ。CEFR A2の語彙をクイズとFlash Cardで定着させる。",
};

const navItems = [
  { href: "/", label: "ホーム" },
  { href: "/quiz", label: "クイズ" },
  { href: "/vocabulary", label: "単語帳" },
  { href: "/flashcards", label: "フラッシュカード" },
  { href: "/review", label: "復習" },
  { href: "/history", label: "学習履歴" },
  { href: "/statistics", label: "統計" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="min-h-screen antialiased">
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-wide">
              KAZU
            </Link>
            <nav className="hidden gap-4 text-sm text-gray-600 md:flex">
              {navItems.slice(1).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="hover:text-gray-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
