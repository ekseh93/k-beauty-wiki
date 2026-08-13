import type { Metadata } from "next";
import { AdminConsole } from "@/components/admin-console";

export const metadata: Metadata = { title: "관리자 콘솔", robots: { index: false, follow: false } };

export default function AdminPage() {
  return <section className="mx-auto max-w-3xl px-5 py-12 lg:px-8 lg:py-16">
    <p className="text-xs uppercase tracking-[0.25em] text-ink/45">Admin</p>
    <h1 className="mt-3 font-display text-4xl">콘텐츠 관리자 콘솔</h1>
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl bg-cream p-4"><p className="text-xs text-ink/50">공개 원칙</p><p className="mt-2 text-sm leading-6">출처·확인일·권리 상태가 확인된 콘텐츠만 공개합니다.</p></div>
      <div className="rounded-xl bg-cream p-4"><p className="text-xs text-ink/50">리뷰 원칙</p><p className="mt-2 text-sm leading-6">커뮤니티 경험담은 최소 5건 이상을 요약한 참고 지표로 표시합니다.</p></div>
    </div>
    <AdminConsole />
  </section>;
}
