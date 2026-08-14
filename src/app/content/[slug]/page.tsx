import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchPublishedContentBySlug, fetchPublishedContents } from "@/lib/content-api";
import { kindLabels } from "@/lib/content";

export const dynamicParams = true;

export async function generateStaticParams() {
  const contents = await fetchPublishedContents();
  return contents.map((content) => ({ slug: content.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const content = await fetchPublishedContentBySlug(params.slug);
  return content ? { title: content.titleJa, description: content.summary, alternates: { canonical: `/content/${content.slug}` } } : {};
}

export default async function ContentDetailPage({ params }: { params: { slug: string } }) {
  const content = await fetchPublishedContentBySlug(params.slug);
  if (!content) notFound();

  const allContents = await fetchPublishedContents();
  const related = content.relatedSlugs.map((slug) => allContents.find((item) => item.slug === slug)).filter((item) => item !== undefined);

  return (
    <article className="mx-auto max-w-5xl px-5 py-12 lg:px-8 lg:py-16">
      <Link href="/content" className="text-sm text-ink/55 hover:text-ink">← 一覧に戻る</Link>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_0.72fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-sage/25 px-3 py-1 text-xs">{kindLabels[content.kind]}</span>{content.isFixture && <span className="rounded-full bg-blush/30 px-3 py-1 text-xs">開発用fixture</span>}</div>
          <h1 className="mt-5 font-display text-4xl leading-tight sm:text-6xl">{content.titleJa}</h1>
          <p className="mt-3 text-lg text-ink/55">{content.koreanName}</p>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-ink/75">{content.summary}</p>
          <div className="mt-8 rounded-2xl border border-blush/60 bg-blush/15 p-5 text-sm leading-7"><strong>注意：</strong> {content.caution}</div>
          <div className="mt-10 space-y-5 text-base leading-8 text-ink/75">{content.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
        </div>
        <aside className="h-fit rounded-2xl border border-line bg-white/65 p-5 lg:sticky lg:top-6">
          <p className="text-xs uppercase tracking-[0.2em] text-ink/45">Verification</p>
          <dl className="mt-5 space-y-4 text-sm">
            <div><dt className="text-ink/50">ステータス</dt><dd className="mt-1 font-medium">{content.status === "review" ? "検証待ち" : content.status}</dd></div>
            <div><dt className="text-ink/50">最終確認日</dt><dd className="mt-1 font-medium">{content.lastVerifiedAt}</dd></div>
            <div><dt className="text-ink/50">更新日</dt><dd className="mt-1 font-medium">{content.updatedAt}</dd></div>
          </dl>
          <div className="mt-6 border-t border-line pt-5"><p className="text-xs text-ink/50">出典</p>{content.sources.map((source) => <a className="mt-2 block text-sm underline decoration-ink/20 underline-offset-4 hover:decoration-ink" href={source.url} key={source.url} rel="noreferrer">{source.title}</a>)}</div>
          <Link href={`/correction?slug=${content.slug}`} className="mt-6 block rounded-xl border border-ink/15 px-4 py-3 text-center text-sm transition hover:border-ink/50">この情報を訂正依頼する</Link>
        </aside>
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-2">
        {content.kind === "treatment" ? <>
          <InfoBlock title="基本情報" rows={[["原理", content.principle], ["一般的な目的", content.purpose], ["価格範囲", content.priceRange], ["調査条件", content.priceCondition], ["所要時間", content.duration], ["ダウンタイム", content.downtime], ["維持期間", content.maintenance]]} />
          <ListBlock title="相談・注意" items={[...content.consultOrAvoid, ...content.sideEffects]} />
        </> : <>
          <InfoBlock title="商品情報" rows={[["ブランド", content.brand], ["タイプ", content.productType], ["容量", content.volume], ["価格", `${content.price} ${content.currency}`], ["容量あたり価格", content.pricePerVolume], ["価格調査日", content.priceCheckedAt]]} />
          <ListBlock title="成分と使い方" items={[...content.keyIngredients.map((ingredient) => `${ingredient.name}：${ingredient.role}`), ...content.usage]} />
        </>}
      </div>

      {related.length > 0 && <section className="mt-14"><h2 className="font-display text-2xl">関連コンテンツ</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">{related.map((item) => <Link key={item.slug} href={`/content/${item.slug}`} className="rounded-2xl border border-line bg-white/60 p-5 transition hover:border-ink/40"><span className="text-xs text-ink/50">{kindLabels[item.kind]}</span><h3 className="mt-2 font-display text-xl">{item.titleJa}</h3><p className="mt-2 text-sm leading-6 text-ink/60">{item.summary}</p></Link>)}</div></section>}
    </article>
  );
}

function InfoBlock({ title, rows }: { title: string; rows: [string, string][] }) {
  return <section className="rounded-2xl border border-line bg-white/60 p-5 sm:p-6"><h2 className="font-display text-2xl">{title}</h2><dl className="mt-5 divide-y divide-line">{rows.map(([label, value]) => <div key={label} className="grid gap-2 py-3 sm:grid-cols-[10rem_1fr]"><dt className="text-sm text-ink/50">{label}</dt><dd className="text-sm leading-6 text-ink/75">{value}</dd></div>)}</dl></section>;
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return <section className="rounded-2xl border border-line bg-white/60 p-5 sm:p-6"><h2 className="font-display text-2xl">{title}</h2><ul className="mt-5 space-y-3 text-sm leading-6 text-ink/75">{items.map((item) => <li key={item} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blush" />{item}</li>)}</ul></section>;
}
