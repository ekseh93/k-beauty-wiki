import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://k-beauty-atlas-japan.example.com"),
  title: {
    default: "K-Beauty Atlas Japan",
    template: "%s | K-Beauty Atlas Japan",
  },
  description: "日本語で読む、韓国美容情報の独立百科。施術・スキンケア・メイクアップを出典と確認日つきで整理します。",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <header className="border-b border-line/80 bg-cream/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
            <Link href="/" className="group flex items-baseline gap-2" aria-label="K-Beauty Atlas Japan ホーム">
              <span className="font-display text-xl tracking-tight">K-Beauty Atlas</span>
              <span className="text-xs uppercase tracking-[0.25em] text-ink/55">Japan</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm text-ink/70 sm:gap-6" aria-label="メインナビゲーション">
              <Link className="transition hover:text-ink" href="/content">探す</Link>
              <Link className="transition hover:text-ink" href="/policy">編集方針</Link>
              <Link className="transition hover:text-ink" href="/ranking">評価基準</Link>
              <Link className="rounded-full border border-ink/20 px-3 py-1.5 transition hover:border-ink/50 hover:bg-white/40" href="/admin">
                管理者
              </Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="border-t border-line/80 bg-cream px-5 py-8 text-sm text-ink/60 lg:px-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 K-Beauty Atlas Japan · 開発中のMVP</p>
            <div className="flex gap-4">
              <Link href="/policy" className="hover:text-ink">免責・編集方針</Link>
              <Link href="/ranking" className="hover:text-ink">評価基準</Link>
              <Link href="/correction" className="hover:text-ink">訂正依頼</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
