import type { Metadata } from "next";

export const metadata: Metadata = { title: "訂正依頼", alternates: { canonical: "/correction" } };

export default function CorrectionPage() {
  return <section className="mx-auto max-w-2xl px-5 py-12 lg:px-8 lg:py-16"><p className="text-xs uppercase tracking-[0.25em] text-ink/45">Correction</p><h1 className="mt-3 font-display text-4xl">訂正依頼</h1><p className="mt-5 text-sm leading-7 text-ink/65">誤りや古くなった情報を見つけた場合は、対象ページと根拠を添えて管理者へ知らせてください。MVPでは送信フォームを準備中です。</p><div className="mt-8 rounded-2xl border border-line bg-white/60 p-6 text-sm leading-7 text-ink/70"><p>受付予定項目</p><ul className="mt-3 list-disc space-y-1 pl-5"><li>対象コンテンツのslug</li><li>訂正内容</li><li>確認できる出典URL</li><li>連絡先（任意）</li></ul></div></section>;
}
