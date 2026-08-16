import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "評価基準とランキング",
  description: "K-Beauty Atlas Japanの評価基準、出典、ランキング公開条件を説明します。",
  alternates: { canonical: "/ranking" },
};

const criteria = [
  ["出典の確認", "35%", "公式・公的情報を優先し、確認日と地域別の商品仕様を記録します。"],
  ["情報の新しさ", "25%", "価格、容量、成分、使用方法など変動する情報の最終確認日を見ます。"],
  ["日本語での比較可能性", "20%", "価格条件、対象、使い方、注意事項を同じ基準で比較できるかを確認します。"],
  ["注意事項の明確さ", "20%", "個人差、医療相談、購入前に確認すべき条件を省略せずに表示します。"],
] as const;

export default function RankingPage() {
  return (
    <article className="mx-auto max-w-4xl px-5 py-12 lg:px-8 lg:py-16">
      <p className="text-xs uppercase tracking-[0.25em] text-ink/45">Evaluation</p>
      <h1 className="mt-3 font-display text-4xl sm:text-5xl">評価基準とランキング</h1>
      <p className="mt-6 max-w-2xl text-base leading-8 text-ink/70">K-Beauty Atlas Japanの評価は、人気や広告費だけで決めません。出典と確認日を公開し、同じ条件で比較できる情報だけを評価対象にします。</p>

      <section className="mt-10 rounded-2xl border border-blush/60 bg-blush/15 p-5 sm:p-6" aria-labelledby="ranking-status">
        <h2 id="ranking-status" className="font-display text-2xl">現在の公開状況</h2>
        <p className="mt-3 text-sm leading-7 text-ink/75">現時点では、十分な件数と同一基準の検証済みデータがそろっていないため、順位とスコアは公開していません。検証待ちのコンテンツを順位に含めることもありません。</p>
      </section>

      <section className="mt-10" aria-labelledby="criteria-heading">
        <h2 id="criteria-heading" className="font-display text-2xl">評価項目</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {criteria.map(([label, weight, description]) => <article key={label} className="rounded-2xl border border-line bg-white/60 p-5"><div className="flex items-center justify-between gap-3"><h3 className="font-medium">{label}</h3><span className="rounded-full bg-sage/20 px-3 py-1 text-xs">{weight}</span></div><p className="mt-3 text-sm leading-7 text-ink/65">{description}</p></article>)}
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-line bg-white/60 p-5 sm:p-6" aria-labelledby="publication-heading">
        <h2 id="publication-heading" className="font-display text-2xl">ランキング公開条件</h2>
        <ol className="mt-5 list-decimal space-y-3 pl-5 text-sm leading-7 text-ink/70">
          <li>同じカテゴリで比較できる公開コンテンツが最低3件以上必要です。</li>
          <li>各コンテンツに確認可能な出典、最終確認日、価格・仕様の条件が必要です。</li>
          <li>権利・訂正依頼の処理中コンテンツと検証待ちコンテンツは除外します。</li>
          <li>評価基準とデータ確認日を表示し、出典が変わった場合はランキングを再確認します。</li>
        </ol>
      </section>
    </article>
  );
}
