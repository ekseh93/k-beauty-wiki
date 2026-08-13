"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthenticationDetails, CognitoUser, CognitoUserPool, type CognitoUserSession } from "amazon-cognito-identity-js";

const poolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? "";
const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "";
const apiUrl = process.env.NEXT_PUBLIC_CONTENT_API_URL ?? "";

type ContentKind = "treatment" | "skincare" | "makeup";
type ContentStatus = "draft" | "review" | "published";
type SourceType = "official-api" | "written-permission" | "public-fact" | "short-quote" | "manual-reference" | "community-review";
type RightsStatus = "verified" | "reference-only" | "needs-review" | "rejected";
type ExtractionMethod = "api" | "licensed-import" | "manual" | "no-automation";
type CorrectionStatus = "open" | "in_review" | "resolved" | "rejected";

interface CorrectionRequest {
  id: string;
  slug: string;
  message: string;
  sourceUrl?: string;
  contact?: string;
  requestType: "correction" | "rights";
  status: CorrectionStatus;
  createdAt: string;
  resolutionNote?: string;
}

interface FormState {
  titleJa: string;
  koreanName: string;
  slug: string;
  summary: string;
  kind: ContentKind;
  status: ContentStatus;
  sourceTitle: string;
  sourceUrl: string;
  sourceType: SourceType;
  rightsStatus: RightsStatus;
  extractionMethod: ExtractionMethod;
  quote: string;
  lastVerifiedAt: string;
  includeReviewEvidence: boolean;
  sampleCount: string;
  independentSourceCount: string;
  reviewCollectedAt: string;
  reviewSummary: string;
  reviewSourceUrls: string;
}

const initialForm: FormState = {
  titleJa: "",
  koreanName: "",
  slug: "",
  summary: "",
  kind: "skincare",
  status: "draft",
  sourceTitle: "",
  sourceUrl: "",
  sourceType: "official-api",
  rightsStatus: "needs-review",
  extractionMethod: "api",
  quote: "",
  lastVerifiedAt: "",
  includeReviewEvidence: false,
  sampleCount: "5",
  independentSourceCount: "1",
  reviewCollectedAt: "",
  reviewSummary: "",
  reviewSourceUrls: "",
};

export function AdminConsole() {
  const configured = Boolean(poolId && clientId && apiUrl);
  const pool = useMemo(() => configured ? new CognitoUserPool({ UserPoolId: poolId, ClientId: clientId }) : null, [configured]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<CognitoUserSession | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pool) return;
    setBusy(true);
    setMessage("");
    const user = new CognitoUser({ Username: email, Pool: pool });
    user.authenticateUser(new AuthenticationDetails({ Username: email, Password: password }), {
      onSuccess: (nextSession) => {
        setSession(nextSession);
        setMessage("관리자 로그인에 성공했습니다.");
        setBusy(false);
      },
      onFailure: (error) => {
        setMessage(`로그인에 실패했습니다: ${error.message}`);
        setBusy(false);
      },
    });
  }

  async function saveContent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setBusy(true);
    setMessage("");

    const source = {
      title: form.sourceTitle,
      url: form.sourceUrl,
      checkedAt: form.lastVerifiedAt,
      sourceType: form.sourceType,
      rightsStatus: form.rightsStatus,
      extractionMethod: form.extractionMethod,
      ...(form.quote.trim() ? { quote: form.quote.trim() } : {}),
    };
    const reviewEvidence = form.includeReviewEvidence ? {
      sampleCount: Number(form.sampleCount),
      independentSourceCount: Number(form.independentSourceCount),
      collectedAt: form.reviewCollectedAt,
      summary: form.reviewSummary,
      sourceUrls: form.reviewSourceUrls.split("\n").map((url) => url.trim()).filter(Boolean),
    } : undefined;

    try {
      const response = await fetch(`${apiUrl}/admin/content`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${session.getIdToken().getJwtToken()}`,
        },
        body: JSON.stringify({
          titleJa: form.titleJa,
          koreanName: form.koreanName,
          slug: form.slug,
          summary: form.summary,
          kind: form.kind,
          status: form.status,
          body: [form.summary],
          tags: [],
          aliases: [],
          sources: [source],
          lastVerifiedAt: form.lastVerifiedAt,
          reviewEvidence,
          isFixture: false,
          relatedSlugs: [],
        }),
      });
      const responseBody = await response.json().catch(() => ({})) as { message?: string; errors?: string[] };
      if (response.ok) {
        setMessage("콘텐츠를 저장했습니다. 공개 전 검수 상태를 확인하세요.");
      } else {
        setMessage([responseBody.message ?? "콘텐츠 저장에 실패했습니다.", ...(responseBody.errors ?? [])].join(" "));
      }
    } catch {
      setMessage("API에 연결하지 못했습니다. 환경 변수와 배포 상태를 확인하세요.");
    } finally {
      setBusy(false);
    }
  }

  if (!configured) {
    return <div className="mt-8 rounded-2xl border border-blush/60 bg-blush/15 p-6 text-sm leading-7 text-ink/70">관리자 기능을 사용하려면 Cognito와 API 환경 변수인 <code>NEXT_PUBLIC_COGNITO_USER_POOL_ID</code>, <code>NEXT_PUBLIC_COGNITO_CLIENT_ID</code>, <code>NEXT_PUBLIC_CONTENT_API_URL</code>을 설정해야 합니다.</div>;
  }

  if (!session) {
    return <form onSubmit={signIn} className="mt-8 max-w-md rounded-2xl border border-line bg-white/60 p-6">
      <h2 className="font-display text-2xl">관리자 로그인</h2>
      <p className="mt-2 text-sm leading-6 text-ink/60">Cognito에 등록된 관리자 계정으로 로그인하세요.</p>
      <Field label="이메일" type="email" value={email} onChange={setEmail} required />
      <Field label="비밀번호" type="password" value={password} onChange={setPassword} required />
      <button disabled={busy} className="mt-5 w-full rounded-xl bg-ink px-4 py-3 text-sm text-white disabled:opacity-50">{busy ? "로그인 중..." : "로그인"}</button>
      {message && <p className="mt-4 text-sm text-ink/60">{message}</p>}
    </form>;
  }

  return <><form onSubmit={saveContent} className="mt-8 rounded-2xl border border-line bg-white/60 p-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h2 className="font-display text-2xl">콘텐츠 등록</h2><p className="mt-1 text-sm text-ink/60">출처 권리와 검수 근거를 입력해야 공개할 수 있습니다.</p></div>
      <span className="rounded-full bg-sage/25 px-3 py-1 text-xs">Cognito 인증 완료</span>
    </div>

    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <Field label="일본어 제목" value={form.titleJa} onChange={(value) => updateForm("titleJa", value)} required />
      <Field label="한국어 원명" value={form.koreanName} onChange={(value) => updateForm("koreanName", value)} required />
      <Field label="slug" value={form.slug} onChange={(value) => updateForm("slug", value)} required />
      <SelectField label="콘텐츠 유형" value={form.kind} onChange={(value) => updateForm("kind", value as ContentKind)} options={[{ value: "treatment", label: "시술" }, { value: "skincare", label: "스킨케어" }, { value: "makeup", label: "메이크업" }]} />
    </div>
    <label className="mt-4 block text-sm">일본어 요약<textarea required value={form.summary} onChange={(event) => updateForm("summary", event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-line bg-cream px-3 py-2 outline-none focus:border-ink/50" /></label>

    <div className="mt-8 border-t border-line pt-6"><h3 className="font-display text-xl">출처와 권리</h3><p className="mt-1 text-sm leading-6 text-ink/60">권리 상태가 검증됨 또는 참고 전용이어야 published로 저장할 수 있습니다.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="출처 제목" value={form.sourceTitle} onChange={(value) => updateForm("sourceTitle", value)} required />
        <Field label="출처 URL" type="url" value={form.sourceUrl} onChange={(value) => updateForm("sourceUrl", value)} required />
        <SelectField label="출처 유형" value={form.sourceType} onChange={(value) => updateForm("sourceType", value as SourceType)} options={[{ value: "official-api", label: "공식 API" }, { value: "written-permission", label: "서면 허가" }, { value: "public-fact", label: "공개 사실" }, { value: "short-quote", label: "짧은 인용" }, { value: "manual-reference", label: "수동 참고" }, { value: "community-review", label: "커뮤니티 리뷰" }]} />
        <SelectField label="권리 상태" value={form.rightsStatus} onChange={(value) => updateForm("rightsStatus", value as RightsStatus)} options={[{ value: "verified", label: "검증됨" }, { value: "reference-only", label: "참고 전용" }, { value: "needs-review", label: "검토 필요" }, { value: "rejected", label: "사용 거부" }]} />
        <SelectField label="수집 방식" value={form.extractionMethod} onChange={(value) => updateForm("extractionMethod", value as ExtractionMethod)} options={[{ value: "api", label: "API" }, { value: "licensed-import", label: "허가된 가져오기" }, { value: "manual", label: "수동 입력" }, { value: "no-automation", label: "자동 수집 안 함" }]} />
        <Field label="최종 확인일" type="date" value={form.lastVerifiedAt} onChange={(value) => updateForm("lastVerifiedAt", value)} required />
      </div>
      {form.sourceType === "short-quote" && <label className="mt-4 block text-sm">짧은 인용문<textarea value={form.quote} onChange={(event) => updateForm("quote", event.target.value)} maxLength={500} className="mt-2 min-h-20 w-full rounded-xl border border-line bg-cream px-3 py-2" placeholder="필요한 최소한의 인용만 입력하세요." /></label>}
    </div>

    <div className="mt-8 border-t border-line pt-6"><label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={form.includeReviewEvidence} onChange={(event) => updateForm("includeReviewEvidence", event.target.checked)} className="mt-1" /><span><strong>커뮤니티 리뷰 집계 근거 추가</strong><span className="mt-1 block text-ink/60">원문 전체가 아니라 5건 이상의 경험담을 요약한 경우에만 사용합니다.</span></span></label>
      {form.includeReviewEvidence && <div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="표본 수" type="number" value={form.sampleCount} onChange={(value) => updateForm("sampleCount", value)} required /><Field label="독립 출처 수" type="number" value={form.independentSourceCount} onChange={(value) => updateForm("independentSourceCount", value)} required /><Field label="집계일" type="date" value={form.reviewCollectedAt} onChange={(value) => updateForm("reviewCollectedAt", value)} required /><label className="block text-sm sm:col-span-2">요약<textarea required value={form.reviewSummary} onChange={(event) => updateForm("reviewSummary", event.target.value)} className="mt-2 min-h-20 w-full rounded-xl border border-line bg-cream px-3 py-2" /></label><label className="block text-sm sm:col-span-2">근거 URL(한 줄에 하나)<textarea required value={form.reviewSourceUrls} onChange={(event) => updateForm("reviewSourceUrls", event.target.value)} className="mt-2 min-h-20 w-full rounded-xl border border-line bg-cream px-3 py-2" /></label></div>}
    </div>

    <div className="mt-8 border-t border-line pt-6"><SelectField label="상태" value={form.status} onChange={(value) => updateForm("status", value as ContentStatus)} options={[{ value: "draft", label: "초안" }, { value: "review", label: "검수 대기" }, { value: "published", label: "공개" }]} />{form.status === "published" && <p className="mt-3 rounded-xl bg-blush/15 p-3 text-sm leading-6 text-ink/70">공개 시 백엔드가 필수 필드, 출처 URL, 확인일, 권리 상태, 리뷰 근거를 다시 검증합니다.</p>}</div>
    <button disabled={busy} className="mt-6 rounded-xl bg-ink px-5 py-3 text-sm text-white disabled:opacity-50">{busy ? "저장 중..." : "콘텐츠 저장"}</button>
    {message && <p className="mt-4 text-sm leading-6 text-ink/60">{message}</p>}
  </form><ContentPreview form={form} /><CorrectionQueue apiUrl={apiUrl} session={session} /></>;
}

function ContentPreview({ form }: { form: FormState }) {
  const requiredReady = Boolean(
    form.titleJa.trim() &&
    form.koreanName.trim() &&
    form.slug.trim() &&
    form.summary.trim() &&
    form.sourceTitle.trim() &&
    form.sourceUrl.trim() &&
    form.lastVerifiedAt,
  );
  const rightsReady = form.rightsStatus === "verified" || form.rightsStatus === "reference-only";
  const reviewReady = !form.includeReviewEvidence || (
    Number(form.sampleCount) >= 5 &&
    Number(form.independentSourceCount) >= 1 &&
    Boolean(form.reviewCollectedAt && form.reviewSummary.trim() && form.reviewSourceUrls.trim())
  );
  const publishReady = requiredReady && rightsReady && reviewReady;
  const kindLabel = { treatment: "시술", skincare: "스킨케어", makeup: "메이크업" }[form.kind];

  return <section className="mt-8 rounded-2xl border border-line bg-white/60 p-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h2 className="font-display text-2xl">공개 미리보기</h2><p className="mt-1 text-sm text-ink/60">일반 방문자에게 공개될 일본어 카드와 공개 전 검수 상태를 확인합니다.</p></div>
      <span className={`rounded-full px-3 py-1 text-xs ${publishReady ? "bg-sage/25" : "bg-blush/20"}`}>{publishReady ? "공개 조건 충족" : "검수 필요"}</span>
    </div>

    <div className="mt-5 rounded-2xl border border-line bg-cream p-5">
      <p className="text-xs text-ink/50">{kindLabel} {form.slug ? `· ${form.slug}` : ""}</p>
      <h3 className="mt-2 font-display text-2xl">{form.titleJa || "일본어 제목을 입력하세요"}</h3>
      <p className="mt-1 text-sm text-ink/55">{form.koreanName || "한국어 원명"}</p>
      <p className="mt-4 text-sm leading-7 text-ink/75">{form.summary || "한 줄 요약이 여기에 표시됩니다."}</p>
      <div className="mt-5 grid gap-3 text-xs text-ink/60 sm:grid-cols-2">
        <p>출처: {form.sourceTitle || "미입력"}</p>
        <p>최종 확인일: {form.lastVerifiedAt || "미입력"}</p>
        {form.includeReviewEvidence && <p className="sm:col-span-2">리뷰 근거: {form.sampleCount || "0"}개 게시글 · 독립 출처 {form.independentSourceCount || "0"}개</p>}
      </div>
    </div>

    <div className="mt-5 grid gap-2 text-sm sm:grid-cols-3">
      <CheckItem ok={requiredReady} label="필수 필드와 최종 확인일" />
      <CheckItem ok={rightsReady} label="출처 권리 상태" />
      <CheckItem ok={reviewReady} label="리뷰 근거 조건" />
    </div>
    {form.status === "published" && !publishReady && <p className="mt-4 rounded-xl bg-blush/15 p-3 text-sm leading-6 text-ink/70">현재 상태는 공개로 선택되었지만 검수 조건을 충족하지 않아 API에서 공개가 차단됩니다.</p>}
  </section>;
}

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return <div className={`rounded-xl px-3 py-3 ${ok ? "bg-sage/15 text-ink/75" : "bg-blush/10 text-ink/60"}`}><span className="mr-2" aria-hidden="true">{ok ? "✓" : "—"}</span>{label}</div>;
}

function Field({ label, value, onChange, required, type = "text" }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string }) {
  return <label className="mt-4 block text-sm">{label}<input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-line bg-cream px-3 outline-none focus:border-ink/50" /></label>;
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return <label className="block text-sm">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-line bg-cream px-3 outline-none focus:border-ink/50">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function CorrectionQueue({ apiUrl, session }: { apiUrl: string; session: CognitoUserSession }) {
  const [requests, setRequests] = useState<CorrectionRequest[]>([]);
  const [draftStatuses, setDraftStatuses] = useState<Record<string, CorrectionStatus>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/admin/corrections`, { headers: { authorization: `Bearer ${session.getIdToken().getJwtToken()}` } });
      const body = await response.json().catch(() => ({})) as { items?: CorrectionRequest[]; message?: string };
      if (!response.ok) throw new Error(body.message ?? "요청 목록을 불러오지 못했습니다.");
      const nextRequests = body.items ?? [];
      setRequests(nextRequests);
      setDraftStatuses(Object.fromEntries(nextRequests.map((request) => [request.id, request.status])));
      setNotes(Object.fromEntries(nextRequests.map((request) => [request.id, request.resolutionNote ?? ""])));
      setMessage(nextRequests.length ? "" : "접수된 정정·권리침해 요청이 없습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "요청 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [apiUrl, session]);

  useEffect(() => { void loadRequests(); }, [loadRequests]);

  async function updateRequest(request: CorrectionRequest) {
    setBusyId(request.id);
    setMessage("");
    try {
      const response = await fetch(`${apiUrl}/admin/corrections`, {
        method: "PUT",
        headers: { "content-type": "application/json", authorization: `Bearer ${session.getIdToken().getJwtToken()}` },
        body: JSON.stringify({ id: request.id, status: draftStatuses[request.id], resolutionNote: notes[request.id] ?? "" }),
      });
      const body = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "요청 상태를 저장하지 못했습니다.");
      setMessage("요청 처리 상태를 저장했습니다.");
      await loadRequests();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "요청 상태를 저장하지 못했습니다.");
    } finally {
      setBusyId("");
    }
  }

  return <section className="mt-8 rounded-2xl border border-line bg-white/60 p-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-display text-2xl">정정·권리침해 요청</h2><p className="mt-1 text-sm text-ink/60">콘텐츠 오류와 권리 관련 요청을 검토하고 처리 상태를 기록합니다.</p></div><button type="button" onClick={() => void loadRequests()} disabled={loading} className="rounded-xl border border-line px-4 py-2 text-sm disabled:opacity-50">새로고침</button></div>
    {loading && <p className="mt-5 text-sm text-ink/60">요청을 불러오는 중...</p>}
    {!loading && requests.length === 0 && <p className="mt-5 rounded-xl bg-cream p-4 text-sm leading-6 text-ink/60">{message || "접수된 요청이 없습니다."}</p>}
    <div className="mt-5 space-y-4">{requests.map((request) => <article key={request.id} className="rounded-xl border border-line bg-cream/60 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-ink/50">{request.requestType === "rights" ? "권리침해 요청" : "정정 요청"} · {new Date(request.createdAt).toLocaleString("ko-KR")}</p><h3 className="mt-1 font-medium">{request.slug}</h3></div><span className="rounded-full bg-white px-3 py-1 text-xs">{request.status}</span></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink/75">{request.message}</p>{request.sourceUrl && <a href={request.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 block truncate text-xs text-ink/55 underline">{request.sourceUrl}</a>}<div className="mt-4 grid gap-3 sm:grid-cols-[12rem_1fr_auto] sm:items-end"><label className="block text-sm">처리 상태<select value={draftStatuses[request.id] ?? request.status} onChange={(event) => setDraftStatuses((current) => ({ ...current, [request.id]: event.target.value as CorrectionStatus }))} className="mt-2 min-h-10 w-full rounded-xl border border-line bg-white px-3"><option value="open">접수</option><option value="in_review">검토 중</option><option value="resolved">처리 완료</option><option value="rejected">반려</option></select></label><label className="block text-sm">처리 메모<input value={notes[request.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [request.id]: event.target.value }))} className="mt-2 min-h-10 w-full rounded-xl border border-line bg-white px-3" /></label><button type="button" onClick={() => void updateRequest(request)} disabled={busyId === request.id} className="min-h-10 rounded-xl bg-ink px-4 text-sm text-white disabled:opacity-50">{busyId === request.id ? "저장 중..." : "저장"}</button></div></article>)}</div>
    {message && requests.length > 0 && <p className="mt-4 text-sm text-ink/60">{message}</p>}
  </section>;
}
