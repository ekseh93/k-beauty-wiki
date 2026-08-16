"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { kindLabels, type AtlasContent, type ContentKind } from "@/lib/content";
import { searchContents } from "@/lib/search";

const filterOptions: { value: ContentKind | "all"; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "treatment", label: "施術" },
  { value: "skincare", label: "スキンケア" },
  { value: "makeup", label: "メイクアップ" },
];

function ContentCard({ content, selected, onSelect }: { content: AtlasContent; selected: boolean; onSelect: () => void }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-line bg-white/65 p-5 shadow-sm shadow-ink/5 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full bg-sage/20 px-3 py-1 text-xs font-medium text-ink/75">{kindLabels[content.kind]}</span>
        {content.isFixture && <span className="text-[11px] text-ink/45">開発用fixture</span>}
      </div>
      <Link href={`/content/${content.slug}`} className="mt-5 block flex-1">
        <h3 className="font-display text-xl leading-tight">{content.titleJa}</h3>
        <p className="mt-2 text-sm text-ink/55">{content.koreanName}</p>
        <p className="mt-4 text-sm leading-7 text-ink/75">{content.summary}</p>
      </Link>
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-line/70 pt-4">
        <div className="flex flex-wrap gap-1.5">
          {content.tags.slice(0, 2).map((tag) => <span key={tag} className="text-xs text-ink/50">#{tag}</span>)}
        </div>
        <button
          type="button"
          aria-pressed={selected}
          onClick={onSelect}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition ${selected ? "border-ink bg-ink text-white" : "border-ink/20 hover:border-ink/50"}`}
        >
          {selected ? "比較中" : "比較に追加"}
        </button>
      </div>
    </article>
  );
}

function comparisonValue(content: AtlasContent, field: "type" | "purpose" | "price" | "use" | "caution" | "verified"): string {
  if (field === "type") return kindLabels[content.kind];
  if (field === "price") return content.kind === "treatment" ? content.priceRange : `${content.price} ${content.currency}`;
  if (field === "verified") return content.lastVerifiedAt;
  if (field === "caution") return content.caution;
  if (content.kind === "treatment") {
    if (field === "purpose") return content.purpose;
    return content.duration ? `所要時間: ${content.duration}` : "本文で確認";
  }
  if (field === "purpose") return content.productType;
  return content.usage[0] ?? "本文で確認";
}

function ComparisonTable({ contents }: { contents: AtlasContent[] }) {
  const rows: { label: string; field: Parameters<typeof comparisonValue>[1] }[] = [
    { label: "分類", field: "type" },
    { label: "用途・目的", field: "purpose" },
    { label: "価格基準", field: "price" },
    { label: "使用・所要情報", field: "use" },
    { label: "注意事項", field: "caution" },
    { label: "最終確認日", field: "verified" },
  ];

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-ink/15 bg-white/95 text-ink" aria-label="比較表">
      <div className="border-b border-line px-4 py-4 sm:px-5">
        <p className="text-xs uppercase tracking-[0.2em] text-ink/45">Comparison</p>
        <h3 className="mt-1 font-display text-xl">共通基準で比較</h3>
        <p className="mt-1 text-xs leading-5 text-ink/55">価格と使用情報は調査条件や製品によって異なるため、本文と出典もあわせて確認してください。</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[44rem] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-cream/70">
              <th scope="col" className="w-36 px-4 py-3 font-medium text-ink/55 sm:px-5">基準</th>
              {contents.map((content) => <th scope="col" key={content.slug} className="min-w-52 px-4 py-3 font-medium sm:px-5">{content.titleJa}<span className="mt-1 block text-xs font-normal text-ink/50">{content.koreanName}</span></th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => <tr key={row.field} className="border-b border-line/70 align-top last:border-b-0"><th scope="row" className="px-4 py-3 font-medium text-ink/55 sm:px-5">{row.label}</th>{contents.map((content) => <td key={`${content.slug}-${row.field}`} className="px-4 py-3 leading-6 text-ink/75 sm:px-5">{comparisonValue(content, row.field)}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ContentExplorer({ contents }: { contents: AtlasContent[] }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<ContentKind | "all">("all");
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const results = useMemo(() => searchContents(contents, query, kind), [contents, kind, query]);
  const selected = contents.filter((content) => selectedSlugs.includes(content.slug));

  function toggleSelection(slug: string) {
    setSelectedSlugs((current) => {
      if (current.includes(slug)) return current.filter((item) => item !== slug);
      if (current.length >= 3) return current;
      return [...current, slug];
    });
  }

  return (
    <div>
      <div className="rounded-2xl border border-line bg-white/70 p-4 shadow-sm sm:p-5">
        <label htmlFor="content-search" className="text-sm font-medium">キーワードで探す</label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            id="content-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="例：CICA、물광주사、保湿"
            className="min-h-11 flex-1 rounded-xl border border-line bg-cream px-4 text-sm outline-none ring-offset-2 transition focus:border-ink/50 focus:ring-2 focus:ring-blush/50"
          />
          <select value={kind} onChange={(event) => setKind(event.target.value as ContentKind | "all")} className="min-h-11 rounded-xl border border-line bg-cream px-4 text-sm outline-none focus:border-ink/50">
            {filterOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <button key={option.value} type="button" onClick={() => setKind(option.value)} className={`rounded-full border px-3 py-1.5 text-xs transition ${kind === option.value ? "border-ink bg-ink text-white" : "border-line hover:border-ink/50"}`}>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-sm text-ink/60">{results.length}件のコンテンツ</p>
        <p className="text-xs text-ink/45">最大3件まで比較できます</p>
      </div>

      {selected.length > 0 && (
        <section className="mt-4 rounded-2xl border border-ink/15 bg-ink p-4 text-white sm:p-5" aria-label="比較リスト">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">Compare</p>
              <h2 className="mt-1 font-display text-xl">比較する項目</h2>
            </div>
            <button type="button" onClick={() => setSelectedSlugs([])} className="self-start rounded-full border border-white/25 px-3 py-1.5 text-xs text-white/80 hover:border-white/60">クリア</button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {selected.map((content) => (
              <div key={content.slug} className="rounded-xl bg-white/10 p-3">
                <p className="text-xs text-white/55">{kindLabels[content.kind]}</p>
                <p className="mt-1 font-medium">{content.titleJa}</p>
                <p className="mt-2 text-xs leading-5 text-white/65">{content.kind === "treatment" ? `価格：${content.priceRange}` : `価格：${content.price}`}</p>
              </div>
            ))}
          </div>
          <ComparisonTable contents={selected} />
        </section>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {results.map((content) => <ContentCard key={content.id} content={content} selected={selectedSlugs.includes(content.slug)} onSelect={() => toggleSelection(content.slug)} />)}
      </div>
      {results.length === 0 && <p className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-ink/55">条件に一致するコンテンツがありません。</p>}
    </div>
  );
}
