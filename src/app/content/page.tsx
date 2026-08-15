import type { Metadata } from "next";
import { ContentExplorer } from "@/components/content-explorer";
import { fetchPublishedContents } from "@/lib/content-api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "コンテンツを探す", alternates: { canonical: "/content" } };

export default async function ContentPage() {
  const contents = await fetchPublishedContents();
  return (
    <section className="mx-auto max-w-6xl px-5 py-12 lg:px-8 lg:py-16">
      <div className="max-w-2xl"><p className="text-xs uppercase tracking-[0.25em] text-ink/45">Library</p><h1 className="mt-3 font-display text-4xl sm:text-5xl">コンテンツを探す</h1><p className="mt-5 leading-8 text-ink/65">日本語タイトル、韓国語原名、別名、タグから検索できます。公開前のfixtureには明確なラベルを付けています。</p></div>
      <div className="mt-10"><ContentExplorer contents={contents} /></div>
    </section>
  );
}
