import type { Metadata } from "next";
import { AdminConsole } from "@/components/admin-console";

export const metadata: Metadata = { title: "管理者", robots: { index: false, follow: false } };

export default function AdminPage() {
  return <section className="mx-auto max-w-3xl px-5 py-12 lg:px-8 lg:py-16"><p className="text-xs uppercase tracking-[0.25em] text-ink/45">Admin</p><h1 className="mt-3 font-display text-4xl">管理者コンソール</h1><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-cream p-4"><p className="text-xs text-ink/50">公開ルール</p><p className="mt-2 text-sm">必須フィールド、出典、確認日が揃うまで公開不可</p></div><div className="rounded-xl bg-cream p-4"><p className="text-xs text-ink/50">監査</p><p className="mt-2 text-sm">変更リビジョンと更新者を記録</p></div></div><AdminConsole /></section>;
}
