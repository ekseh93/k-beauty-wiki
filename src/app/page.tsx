import Link from "next/link";
import { ContentExplorer } from "@/components/content-explorer";
import { fixtureContent } from "@/lib/content";

export default function HomePage() {
  return (
    <>
      <section className="paper-grid border-b border-line/70">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-24">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-ink/50">Independent beauty encyclopedia · Japan</p>
            <h1 className="mt-6 max-w-3xl font-display text-5xl leading-[1.05] tracking-tight sm:text-7xl">韓国美容を、<br /><span className="text-ink/50">確かめながら読む。</span></h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-ink/70 sm:text-lg">施術とコスメを、出典・確認日・注意点と一緒に整理する日本語の情報アトラス。買う前、受ける前に、比較できる材料を。</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/content" className="rounded-full bg-ink px-5 py-3 text-sm text-white transition hover:bg-ink/80">コンテンツを探す</Link>
              <Link href="/policy" className="rounded-full border border-ink/20 px-5 py-3 text-sm transition hover:border-ink/50">編集方針を見る</Link>
            </div>
          </div>
          <div className="relative flex min-h-72 items-end overflow-hidden rounded-[2rem] bg-blush/60 p-6 sm:min-h-96 sm:p-8">
            <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[24px] border-white/35" />
            <div className="absolute right-12 top-14 h-28 w-28 rounded-full bg-sage/50 blur-sm" />
            <div className="relative max-w-xs">
              <p className="text-xs uppercase tracking-[0.25em] text-ink/55">Atlas note 001</p>
              <p className="mt-5 font-display text-3xl leading-tight">情報は、<br />更新日までが情報。</p>
              <p className="mt-4 text-sm leading-6 text-ink/65">出典と最終確認日を見える場所に置き、変わる情報を変わったままにしません。</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14 lg:px-8 lg:py-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div><p className="text-xs uppercase tracking-[0.25em] text-ink/45">Explore</p><h2 className="mt-2 font-display text-3xl">いま読める項目</h2></div>
          <span className="rounded-full bg-blush/25 px-3 py-1.5 text-xs text-ink/70">開発用fixtureを表示中</span>
        </div>
        <ContentExplorer contents={fixtureContent} />
      </section>
    </>
  );
}
