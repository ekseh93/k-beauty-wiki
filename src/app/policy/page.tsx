import type { Metadata } from "next";

export const metadata: Metadata = { title: "編集方針と免責", alternates: { canonical: "/policy" } };

export default function PolicyPage() {
  return <article className="mx-auto max-w-3xl px-5 py-12 lg:px-8 lg:py-16"><p className="text-xs uppercase tracking-[0.25em] text-ink/45">Policy</p><h1 className="mt-3 font-display text-4xl sm:text-5xl">編集方針と免責</h1><div className="mt-10 space-y-10 text-sm leading-8 text-ink/75"><section><h2 className="font-display text-2xl text-ink">独立した情報サイト</h2><p className="mt-3">K-Beauty Atlas Japanは、商品販売、予約、広告掲載を目的としない情報サイトです。ランキングや評価は、基準と出典を公開できる範囲で管理します。</p></section><section><h2 className="font-display text-2xl text-ink">出典と更新</h2><p className="mt-3">価格、成分、施術内容など変動する情報には出典と最終確認日を付けます。確認できない情報は公開せず、開発用fixtureには明確な表示を付けます。</p></section><section><h2 className="font-display text-2xl text-ink">医療情報に関する免責</h2><p className="mt-3">施術情報は一般的な情報提供のみを目的とし、診断、治療、施術の推奨を行うものではありません。受けるかどうか、適応、禁忌、副作用については必ず資格を持つ医療従事者へ相談してください。</p></section><section><h2 className="font-display text-2xl text-ink">プライバシー</h2><p className="mt-3">問い合わせや訂正依頼を受け付ける際は、目的に必要な情報だけを収集し、運用環境のプライバシーポリシーに従って管理します。</p></section></div></article>;
}
