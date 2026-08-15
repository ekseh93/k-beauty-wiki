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
  bodyText: string;
  tags: string;
  aliases: string;
  caution: string;
  kind: ContentKind;
  status: ContentStatus;
  sourceTitle: string;
  sourceUrl: string;
  sourceType: SourceType;
  rightsStatus: RightsStatus;
  extractionMethod: ExtractionMethod;
  additionalSources: string;
  quote: string;
  lastVerifiedAt: string;
  includeReviewEvidence: boolean;
  sampleCount: string;
  independentSourceCount: string;
  reviewCollectedAt: string;
  reviewSummary: string;
  reviewSourceUrls: string;
  principle: string;
  purpose: string;
  suitableFor: string;
  consultOrAvoid: string;
  priceRange: string;
  priceCondition: string;
  duration: string;
  downtime: string;
  maintenance: string;
  sideEffects: string;
  similarTreatments: string;
  brand: string;
  productType: string;
  volume: string;
  price: string;
  currency: string;
  pricePerVolume: string;
  keyIngredients: string;
  skinTypes: string;
  usage: string;
  pros: string;
  considerations: string;
  priceCheckedAt: string;
}

const initialForm: FormState = {
  titleJa: "",
  koreanName: "",
  slug: "",
  summary: "",
  bodyText: "",
  tags: "",
  aliases: "",
  caution: "",
  kind: "skincare",
  status: "draft",
  sourceTitle: "",
  sourceUrl: "",
  sourceType: "official-api",
  rightsStatus: "needs-review",
  extractionMethod: "api",
  additionalSources: "",
  quote: "",
  lastVerifiedAt: "",
  includeReviewEvidence: false,
  sampleCount: "5",
  independentSourceCount: "1",
  reviewCollectedAt: "",
  reviewSummary: "",
  reviewSourceUrls: "",
  principle: "",
  purpose: "",
  suitableFor: "",
  consultOrAvoid: "",
  priceRange: "",
  priceCondition: "",
  duration: "",
  downtime: "",
  maintenance: "",
  sideEffects: "",
  similarTreatments: "",
  brand: "",
  productType: "",
  volume: "",
  price: "",
  currency: "JPY",
  pricePerVolume: "",
  keyIngredients: "",
  skinTypes: "",
  usage: "",
  pros: "",
  considerations: "",
  priceCheckedAt: "",
};

function splitLines(value: string): string[] {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

function splitComma(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function parseIngredients(value: string): { name: string; role: string }[] {
  return splitLines(value).map((line) => {
    const [name, ...role] = line.split("|");
    return { name: name.trim(), role: role.join("|").trim() };
  }).filter((ingredient) => ingredient.name && ingredient.role);
}

function adminAccessMessage(status: number, fallback: string): string {
  if (status === 401 || status === 403) return "관리자 권한을 확인할 수 없습니다. Cognito 초대 계정으로 로그인했고 admin 그룹에 속해 있는지 확인하세요.";
  return fallback;
}

interface AdminContentSummary {
  id: string;
  titleJa: string;
  koreanName: string;
  slug: string;
  kind: ContentKind;
  status: ContentStatus | "archived";
  lastVerifiedAt?: string;
  createdAt: string;
  updatedAt: string;
  sources?: { title: string; rightsStatus: RightsStatus }[];
}

function parseAdditionalSources(value: string): { title: string; url: string }[] {
  return splitLines(value).map((line) => {
    const [title, ...urlParts] = line.split("|");
    return { title: title.trim(), url: urlParts.join("|").trim() };
  });
}

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

type AdminContentItem = AdminContentSummary & Record<string, unknown>;

interface ContentRevision {
  revisionId: string;
  action: "created" | "updated";
  updatedBy: string;
  createdAt: string;
  snapshot?: { status?: string };
}

export function AdminConsole() {
  const configured = Boolean(poolId && clientId && apiUrl);
  const pool = useMemo(() => configured ? new CognitoUserPool({ UserPoolId: poolId, ClientId: clientId }) : null, [configured]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [session, setSession] = useState<CognitoUserSession | null>(null);
  const [currentUser, setCurrentUser] = useState<CognitoUser | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [replacementPassword, setReplacementPassword] = useState("");
  const [replacementPasswordConfirmation, setReplacementPasswordConfirmation] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [pendingPasswordUser, setPendingPasswordUser] = useState<CognitoUser | null>(null);
  const [pendingAttributes, setPendingAttributes] = useState<Record<string, string>>({});
  const [form, setForm] = useState<FormState>(initialForm);
  const [editingId, setEditingId] = useState("");
  const [editingCreatedAt, setEditingCreatedAt] = useState("");
  const [editingRelatedSlugs, setEditingRelatedSlugs] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pool) return;
    const currentUser = pool.getCurrentUser();
    if (!currentUser) return;
    currentUser.getSession((error: Error | null, currentSession: CognitoUserSession | null) => {
      if (!error && currentSession?.isValid()) {
        setSession(currentSession);
        setCurrentUser(currentUser);
        setMessage("저장된 관리자 세션을 복원했습니다.");
      }
    });
  }, [pool]);

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
        setCurrentUser(user);
        setMessage("관리자 로그인에 성공했습니다.");
        setBusy(false);
      },
      newPasswordRequired: (userAttributes, requiredAttributes) => {
        const nextAttributes: Record<string, string> = {};
        for (const attributeName of requiredAttributes ?? []) {
          const value = userAttributes?.[attributeName];
          if (typeof value === "string" && value.length > 0) nextAttributes[attributeName] = value;
        }
        setPendingPasswordUser(user);
        setPendingAttributes(nextAttributes);
        setMessage("초대 계정의 임시 비밀번호가 확인되었습니다. 새 비밀번호를 설정하세요.");
        setBusy(false);
      },
      onFailure: (error) => {
        setMessage(`로그인에 실패했습니다: ${error.message}`);
        setBusy(false);
      },
    });
  }

  function completePasswordChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingPasswordUser) return;
    setBusy(true);
    setMessage("");
    pendingPasswordUser.completeNewPasswordChallenge(newPassword, pendingAttributes, {
      onSuccess: (nextSession) => {
        setSession(nextSession);
        setCurrentUser(pendingPasswordUser);
        setPendingPasswordUser(null);
        setPendingAttributes({});
        setNewPassword("");
        setMessage("관리자 로그인에 성공했습니다.");
        setBusy(false);
      },
      onFailure: (error) => {
        setMessage(`새 비밀번호 설정에 실패했습니다: ${error.message}`);
        setBusy(false);
      },
      newPasswordRequired: () => {
        setMessage("Cognito가 새 비밀번호를 다시 요구했습니다. 새 비밀번호를 다시 입력하세요.");
        setBusy(false);
      },
    });
  }

  function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser) return;
    if (replacementPassword !== replacementPasswordConfirmation) {
      setPasswordMessage("새 비밀번호와 확인 값이 일치하지 않습니다.");
      return;
    }
    setPasswordBusy(true);
    setPasswordMessage("");
    currentUser.changePassword(currentPassword, replacementPassword, (error) => {
      if (error) {
        setPasswordMessage(`비밀번호 변경에 실패했습니다: ${error.message}`);
      } else {
        setCurrentPassword("");
        setReplacementPassword("");
        setReplacementPasswordConfirmation("");
        setPasswordMessage("관리자 비밀번호를 변경했습니다.");
      }
      setPasswordBusy(false);
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
    const additionalSources = parseAdditionalSources(form.additionalSources).map((additionalSource) => ({
      ...additionalSource,
      checkedAt: form.lastVerifiedAt,
      sourceType: form.sourceType,
      rightsStatus: form.rightsStatus,
      extractionMethod: form.extractionMethod,
    }));
    const reviewEvidence = form.includeReviewEvidence ? {
      sampleCount: Number(form.sampleCount),
      independentSourceCount: Number(form.independentSourceCount),
      collectedAt: form.reviewCollectedAt,
      summary: form.reviewSummary,
      sourceUrls: form.reviewSourceUrls.split("\n").map((url) => url.trim()).filter(Boolean),
    } : undefined;
    const details = form.kind === "treatment" ? {
      kind: "treatment" as const,
      principle: form.principle,
      purpose: form.purpose,
      suitableFor: splitLines(form.suitableFor),
      consultOrAvoid: splitLines(form.consultOrAvoid),
      priceRange: form.priceRange,
      priceCondition: form.priceCondition,
      duration: form.duration,
      downtime: form.downtime,
      maintenance: form.maintenance,
      sideEffects: splitLines(form.sideEffects),
      similarTreatments: splitLines(form.similarTreatments),
    } : {
      kind: "product" as const,
      brand: form.brand,
      productType: form.productType,
      volume: form.volume,
      price: form.price,
      currency: form.currency,
      pricePerVolume: form.pricePerVolume,
      keyIngredients: parseIngredients(form.keyIngredients),
      skinTypes: splitLines(form.skinTypes),
      usage: splitLines(form.usage),
      pros: splitLines(form.pros),
      considerations: splitLines(form.considerations),
      priceCheckedAt: form.priceCheckedAt,
    };

    try {
      const response = await fetch(`${apiUrl}/admin/content`, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${session.getIdToken().getJwtToken()}`,
        },
        body: JSON.stringify({
          ...(editingId ? { id: editingId, createdAt: editingCreatedAt } : {}),
          titleJa: form.titleJa,
          koreanName: form.koreanName,
          slug: form.slug,
          summary: form.summary,
          body: splitLines(form.bodyText),
          tags: splitComma(form.tags),
          aliases: splitComma(form.aliases),
          caution: form.caution,
          kind: form.kind,
          status: form.status,
          sources: [source, ...additionalSources],
          lastVerifiedAt: form.lastVerifiedAt,
          reviewEvidence,
          details,
          isFixture: false,
          relatedSlugs: editingRelatedSlugs,
        }),
      });
      const responseBody = await response.json().catch(() => ({})) as { message?: string; errors?: string[] };
      if (response.ok) {
        setMessage("콘텐츠를 저장했습니다. 공개 전 검수 상태를 확인하세요.");
      } else {
        setMessage([adminAccessMessage(response.status, responseBody.message ?? "콘텐츠 저장에 실패했습니다."), ...(responseBody.errors ?? [])].join(" "));
      }
    } catch {
      setMessage("API에 연결하지 못했습니다. 환경 변수와 배포 상태를 확인하세요.");
    } finally {
      setBusy(false);
    }
  }

  function editContent(item: AdminContentItem) {
    const sources = Array.isArray(item.sources) ? item.sources as { title?: unknown; url?: unknown; sourceType?: unknown; rightsStatus?: unknown; extractionMethod?: unknown }[] : [];
    const primarySource = sources[0] ?? {};
    const details = item.details && typeof item.details === "object" ? item.details as Record<string, unknown> : {};
    const ingredients = Array.isArray(details.keyIngredients) ? details.keyIngredients as { name?: unknown; role?: unknown }[] : [];
    setEditingId(item.id);
    setEditingCreatedAt(item.createdAt);
    setEditingRelatedSlugs(toStringList(item.relatedSlugs));
    setForm({
      ...initialForm,
      titleJa: item.titleJa,
      koreanName: item.koreanName,
      slug: item.slug,
      summary: toStringValue(item.summary),
      bodyText: toStringList(item.body).join("\n"),
      tags: toStringList(item.tags).join(", "),
      aliases: toStringList(item.aliases).join(", "),
      caution: toStringValue(item.caution),
      kind: item.kind,
      status: item.status === "archived" ? "draft" : item.status,
      sourceTitle: toStringValue(primarySource.title),
      sourceUrl: toStringValue(primarySource.url),
      sourceType: (primarySource.sourceType as SourceType | undefined) ?? "manual-reference",
      rightsStatus: (primarySource.rightsStatus as RightsStatus | undefined) ?? "needs-review",
      extractionMethod: (primarySource.extractionMethod as ExtractionMethod | undefined) ?? "manual",
      additionalSources: sources.slice(1).map((source) => `${toStringValue(source.title)} | ${toStringValue(source.url)}`).join("\n"),
      lastVerifiedAt: toStringValue(item.lastVerifiedAt),
      brand: toStringValue(details.brand),
      productType: toStringValue(details.productType),
      volume: toStringValue(details.volume),
      price: toStringValue(details.price),
      currency: toStringValue(details.currency) || "JPY",
      pricePerVolume: toStringValue(details.pricePerVolume),
      priceCheckedAt: toStringValue(details.priceCheckedAt),
      keyIngredients: ingredients.map((ingredient) => `${toStringValue(ingredient.name)} | ${toStringValue(ingredient.role)}`).join("\n"),
      skinTypes: toStringList(details.skinTypes).join("\n"),
      usage: toStringList(details.usage).join("\n"),
      pros: toStringList(details.pros).join("\n"),
      considerations: toStringList(details.considerations).join("\n"),
      principle: toStringValue(details.principle),
      purpose: toStringValue(details.purpose),
      suitableFor: toStringList(details.suitableFor).join("\n"),
      consultOrAvoid: toStringList(details.consultOrAvoid).join("\n"),
      priceRange: toStringValue(details.priceRange),
      priceCondition: toStringValue(details.priceCondition),
      duration: toStringValue(details.duration),
      downtime: toStringValue(details.downtime),
      maintenance: toStringValue(details.maintenance),
      sideEffects: toStringList(details.sideEffects).join("\n"),
      similarTreatments: toStringList(details.similarTreatments).join("\n"),
    });
    setMessage("콘텐츠를 편집 모드로 불러왔습니다.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!configured) {
    return <div className="mt-8 rounded-2xl border border-blush/60 bg-blush/15 p-6 text-sm leading-7 text-ink/70">관리자 기능을 사용하려면 Cognito와 API 환경 변수인 <code>NEXT_PUBLIC_COGNITO_USER_POOL_ID</code>, <code>NEXT_PUBLIC_COGNITO_CLIENT_ID</code>, <code>NEXT_PUBLIC_CONTENT_API_URL</code>을 설정해야 합니다.</div>;
  }

  if (pendingPasswordUser && !session) {
    return <form onSubmit={completePasswordChange} className="mt-8 max-w-md rounded-2xl border border-line bg-white/60 p-6">
      <h2 className="font-display text-2xl">새 비밀번호 설정</h2>
      <p className="mt-2 text-sm leading-6 text-ink/60">초대 메일의 임시 비밀번호를 확인했습니다. 새 비밀번호를 설정해야 관리자 화면에 들어갈 수 있습니다.</p>
      <Field label="새 비밀번호" type="password" value={newPassword} onChange={setNewPassword} required />
      <button disabled={busy} className="mt-5 w-full rounded-xl bg-ink px-4 py-3 text-sm text-white disabled:opacity-50">{busy ? "설정 중..." : "새 비밀번호 저장"}</button>
      {message && <p className="mt-4 text-sm text-ink/60">{message}</p>}
    </form>;
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

  return <><form onSubmit={changePassword} className="mt-8 max-w-2xl rounded-2xl border border-line bg-white/60 p-6">
    <h2 className="font-display text-2xl">관리자 비밀번호 변경</h2>
    <p className="mt-2 text-sm leading-6 text-ink/60">현재 비밀번호를 확인한 뒤 새 비밀번호로 Cognito 계정을 변경합니다. 비밀번호는 저장하지 않습니다.</p>
    <div className="mt-4 grid gap-4 sm:grid-cols-3">
      <Field label="현재 비밀번호" type="password" value={currentPassword} onChange={setCurrentPassword} required />
      <Field label="새 비밀번호" type="password" value={replacementPassword} onChange={setReplacementPassword} required />
      <Field label="새 비밀번호 확인" type="password" value={replacementPasswordConfirmation} onChange={setReplacementPasswordConfirmation} required />
    </div>
    <button disabled={passwordBusy} className="mt-5 rounded-xl bg-ink px-5 py-3 text-sm text-white disabled:opacity-50">{passwordBusy ? "변경 중..." : "비밀번호 변경"}</button>
    {passwordMessage && <p className="mt-4 text-sm leading-6 text-ink/60">{passwordMessage}</p>}
  </form><form onSubmit={saveContent} className="mt-8 rounded-2xl border border-line bg-white/60 p-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h2 className="font-display text-2xl">{editingId ? "콘텐츠 편집" : "콘텐츠 등록"}</h2><p className="mt-1 text-sm text-ink/60">출처 권리와 검수 근거를 입력해야 공개할 수 있습니다.</p></div>
      <span className="rounded-full bg-sage/25 px-3 py-1 text-xs">Cognito 인증 완료</span>
    </div>

    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <Field label="일본어 제목" value={form.titleJa} onChange={(value) => updateForm("titleJa", value)} required />
      <Field label="한국어 원명" value={form.koreanName} onChange={(value) => updateForm("koreanName", value)} required />
      <Field label="slug" value={form.slug} onChange={(value) => updateForm("slug", value)} required />
      <SelectField label="콘텐츠 유형" value={form.kind} onChange={(value) => updateForm("kind", value as ContentKind)} options={[{ value: "treatment", label: "시술" }, { value: "skincare", label: "스킨케어" }, { value: "makeup", label: "메이크업" }]} />
    </div>
    <label className="mt-4 block text-sm">일본어 요약<textarea required value={form.summary} onChange={(event) => updateForm("summary", event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-line bg-cream px-3 py-2 outline-none focus:border-ink/50" /></label>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <TextAreaField label="본문 문단 (한 줄에 하나)" value={form.bodyText} onChange={(value) => updateForm("bodyText", value)} required placeholder="출처를 확인한 설명을 문단별로 입력하세요." />
      <TextAreaField label="주의사항" value={form.caution} onChange={(value) => updateForm("caution", value)} required placeholder="일반적인 주의사항과 의료정보 면책을 입력하세요." />
      <Field label="태그 (쉼표로 구분)" value={form.tags} onChange={(value) => updateForm("tags", value)} />
      <Field label="별칭 (쉼표로 구분)" value={form.aliases} onChange={(value) => updateForm("aliases", value)} />
    </div>

    <div className="mt-8 border-t border-line pt-6">
      <h3 className="font-display text-xl">구조화된 상세 정보</h3>
      <p className="mt-1 text-sm leading-6 text-ink/60">공개 콘텐츠는 유형에 맞는 상세 필드를 모두 채워야 합니다. 목록 입력은 한 줄에 하나씩 작성하세요.</p>
      {form.kind === "treatment" ? <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="원리" value={form.principle} onChange={(value) => updateForm("principle", value)} required />
        <Field label="일반적인 목적" value={form.purpose} onChange={(value) => updateForm("purpose", value)} required />
        <TextAreaField label="적합할 수 있는 대상" value={form.suitableFor} onChange={(value) => updateForm("suitableFor", value)} required />
        <TextAreaField label="상담이 필요하거나 피해야 할 대상" value={form.consultOrAvoid} onChange={(value) => updateForm("consultOrAvoid", value)} required />
        <Field label="가격 범위" value={form.priceRange} onChange={(value) => updateForm("priceRange", value)} required />
        <Field label="가격 조사 조건" value={form.priceCondition} onChange={(value) => updateForm("priceCondition", value)} required />
        <Field label="시술 시간" value={form.duration} onChange={(value) => updateForm("duration", value)} required />
        <Field label="다운타임" value={form.downtime} onChange={(value) => updateForm("downtime", value)} required />
        <Field label="유지 기간" value={form.maintenance} onChange={(value) => updateForm("maintenance", value)} required />
        <TextAreaField label="일반적인 부작용과 주의사항" value={form.sideEffects} onChange={(value) => updateForm("sideEffects", value)} required />
        <TextAreaField label="유사 시술" value={form.similarTreatments} onChange={(value) => updateForm("similarTreatments", value)} required />
      </div> : <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="브랜드" value={form.brand} onChange={(value) => updateForm("brand", value)} required />
        <Field label="제품 유형" value={form.productType} onChange={(value) => updateForm("productType", value)} required />
        <Field label="용량" value={form.volume} onChange={(value) => updateForm("volume", value)} required />
        <Field label="기준 가격" value={form.price} onChange={(value) => updateForm("price", value)} required />
        <Field label="통화" value={form.currency} onChange={(value) => updateForm("currency", value)} required />
        <Field label="용량당 가격" value={form.pricePerVolume} onChange={(value) => updateForm("pricePerVolume", value)} required />
        <Field label="가격 조사일" type="text" placeholder="YYYY-MM-DD" value={form.priceCheckedAt} onChange={(value) => updateForm("priceCheckedAt", value)} required />
        <TextAreaField label="주요 성분과 일반적인 역할 (성분 | 역할)" value={form.keyIngredients} onChange={(value) => updateForm("keyIngredients", value)} required placeholder="セラミド | 피부 장벽을 돕는 성분" />
        <TextAreaField label="피부 타입 또는 사용 목적" value={form.skinTypes} onChange={(value) => updateForm("skinTypes", value)} required />
        <TextAreaField label="사용 방법" value={form.usage} onChange={(value) => updateForm("usage", value)} required />
        <TextAreaField label="장점" value={form.pros} onChange={(value) => updateForm("pros", value)} required />
        <TextAreaField label="고려사항" value={form.considerations} onChange={(value) => updateForm("considerations", value)} required />
      </div>}
    </div>

    <div className="mt-8 border-t border-line pt-6"><h3 className="font-display text-xl">출처와 권리</h3><p className="mt-1 text-sm leading-6 text-ink/60">권리 상태가 검증됨 또는 참고 전용이어야 published로 저장할 수 있습니다.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="출처 제목" value={form.sourceTitle} onChange={(value) => updateForm("sourceTitle", value)} required />
        <Field label="출처 URL" type="url" value={form.sourceUrl} onChange={(value) => updateForm("sourceUrl", value)} required />
        <SelectField label="출처 유형" value={form.sourceType} onChange={(value) => updateForm("sourceType", value as SourceType)} options={[{ value: "official-api", label: "공식 API" }, { value: "written-permission", label: "서면 허가" }, { value: "public-fact", label: "공개 사실" }, { value: "short-quote", label: "짧은 인용" }, { value: "manual-reference", label: "수동 참고" }, { value: "community-review", label: "커뮤니티 리뷰" }]} />
        <SelectField label="권리 상태" value={form.rightsStatus} onChange={(value) => updateForm("rightsStatus", value as RightsStatus)} options={[{ value: "verified", label: "검증됨" }, { value: "reference-only", label: "참고 전용" }, { value: "needs-review", label: "검토 필요" }, { value: "rejected", label: "사용 거부" }]} />
        <SelectField label="수집 방식" value={form.extractionMethod} onChange={(value) => updateForm("extractionMethod", value as ExtractionMethod)} options={[{ value: "api", label: "API" }, { value: "licensed-import", label: "허가된 가져오기" }, { value: "manual", label: "수동 입력" }, { value: "no-automation", label: "자동 수집 안 함" }]} />
        <Field label="최종 확인일" type="text" placeholder="YYYY-MM-DD" value={form.lastVerifiedAt} onChange={(value) => updateForm("lastVerifiedAt", value)} required />
      </div>
      <TextAreaField label="추가 출처 (출처 제목 | URL, 한 줄에 하나)" value={form.additionalSources} onChange={(value) => updateForm("additionalSources", value)} placeholder="COSRX Official product page | https://www.cosrx.com/..." />
      {form.sourceType === "short-quote" && <label className="mt-4 block text-sm">짧은 인용문<textarea value={form.quote} onChange={(event) => updateForm("quote", event.target.value)} maxLength={500} className="mt-2 min-h-20 w-full rounded-xl border border-line bg-cream px-3 py-2" placeholder="필요한 최소한의 인용만 입력하세요." /></label>}
    </div>

    <div className="mt-8 border-t border-line pt-6"><label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={form.includeReviewEvidence} onChange={(event) => updateForm("includeReviewEvidence", event.target.checked)} className="mt-1" /><span><strong>커뮤니티 리뷰 집계 근거 추가</strong><span className="mt-1 block text-ink/60">원문 전체가 아니라 5건 이상의 경험담을 요약한 경우에만 사용합니다.</span></span></label>
      {form.includeReviewEvidence && <div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="표본 수" type="number" value={form.sampleCount} onChange={(value) => updateForm("sampleCount", value)} required /><Field label="독립 출처 수" type="number" value={form.independentSourceCount} onChange={(value) => updateForm("independentSourceCount", value)} required /><Field label="집계일" type="date" value={form.reviewCollectedAt} onChange={(value) => updateForm("reviewCollectedAt", value)} required /><label className="block text-sm sm:col-span-2">요약<textarea required value={form.reviewSummary} onChange={(event) => updateForm("reviewSummary", event.target.value)} className="mt-2 min-h-20 w-full rounded-xl border border-line bg-cream px-3 py-2" /></label><label className="block text-sm sm:col-span-2">근거 URL(한 줄에 하나)<textarea required value={form.reviewSourceUrls} onChange={(event) => updateForm("reviewSourceUrls", event.target.value)} className="mt-2 min-h-20 w-full rounded-xl border border-line bg-cream px-3 py-2" /></label></div>}
    </div>

    <div className="mt-8 border-t border-line pt-6"><SelectField label="상태" value={form.status} onChange={(value) => updateForm("status", value as ContentStatus)} options={[{ value: "draft", label: "초안" }, { value: "review", label: "검수 대기" }, { value: "published", label: "공개" }]} />{form.status === "published" && <p className="mt-3 rounded-xl bg-blush/15 p-3 text-sm leading-6 text-ink/70">공개 시 백엔드가 필수 필드, 출처 URL, 확인일, 권리 상태, 리뷰 근거를 다시 검증합니다.</p>}</div>
    <button disabled={busy} className="mt-6 rounded-xl bg-ink px-5 py-3 text-sm text-white disabled:opacity-50">{busy ? "저장 중..." : editingId ? "콘텐츠 수정" : "콘텐츠 저장"}</button>
    {message && <p className="mt-4 text-sm leading-6 text-ink/60">{message}</p>}
  </form><ContentPreview form={form} /><ContentQueue apiUrl={apiUrl} session={session} onEdit={editContent} /><CorrectionQueue apiUrl={apiUrl} session={session} /></>;
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

function Field({ label, value, onChange, required, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; placeholder?: string }) {
  return <label className="mt-4 block text-sm">{label}<input type={type} required={required} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-line bg-cream px-3 outline-none focus:border-ink/50" /></label>;
}

function TextAreaField({ label, value, onChange, required, placeholder }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; placeholder?: string }) {
  return <label className="block text-sm">{label}<textarea required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 min-h-24 w-full rounded-xl border border-line bg-cream px-3 py-2 outline-none focus:border-ink/50" /></label>;
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return <label className="block text-sm">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-line bg-cream px-3 outline-none focus:border-ink/50">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function ContentQueue({ apiUrl, session, onEdit }: { apiUrl: string; session: CognitoUserSession; onEdit: (item: AdminContentItem) => void }) {
  const [items, setItems] = useState<AdminContentItem[]>([]);
  const [draftStatuses, setDraftStatuses] = useState<Record<string, AdminContentItem["status"]>>({});
  const [revisions, setRevisions] = useState<Record<string, ContentRevision[]>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [revisionLoadingId, setRevisionLoadingId] = useState("");
  const [message, setMessage] = useState("");

  const loadContents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/admin/content`, { headers: { authorization: `Bearer ${session.getIdToken().getJwtToken()}` } });
      const body = await response.json().catch(() => ({})) as { items?: AdminContentSummary[]; message?: string };
      if (!response.ok) throw new Error(adminAccessMessage(response.status, body.message ?? "콘텐츠 목록을 불러오지 못했습니다."));
      const nextItems = (body.items ?? []) as AdminContentItem[];
      setItems(nextItems);
      setDraftStatuses(Object.fromEntries(nextItems.map((item) => [item.id, item.status])));
      setMessage(nextItems.length ? "" : "등록된 콘텐츠가 없습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "콘텐츠 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [apiUrl, session]);

  async function updateStatus(item: AdminContentItem) {
    setBusyId(item.id);
    setMessage("");
    try {
      const response = await fetch(`${apiUrl}/admin/content`, {
        method: "PUT",
        headers: { "content-type": "application/json", authorization: `Bearer ${session.getIdToken().getJwtToken()}` },
        body: JSON.stringify({ ...item, status: draftStatuses[item.id] ?? item.status }),
      });
      const body = await response.json().catch(() => ({})) as { message?: string; errors?: string[] };
      if (!response.ok) throw new Error([adminAccessMessage(response.status, body.message ?? "콘텐츠 상태를 저장하지 못했습니다."), ...(body.errors ?? [])].join(" "));
      setMessage("콘텐츠 검수 상태를 저장했습니다.");
      await loadContents();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "콘텐츠 상태를 저장하지 못했습니다.");
    } finally {
      setBusyId("");
    }
  }

  async function loadRevisions(item: AdminContentItem) {
    setRevisionLoadingId(item.id);
    setMessage("");
    try {
      const response = await fetch(`${apiUrl}/admin/content?revisionsFor=${encodeURIComponent(item.id)}`, { headers: { authorization: `Bearer ${session.getIdToken().getJwtToken()}` } });
      const body = await response.json().catch(() => ({})) as { items?: ContentRevision[]; message?: string };
      if (!response.ok) throw new Error(adminAccessMessage(response.status, body.message ?? "변경 이력을 불러오지 못했습니다."));
      setRevisions((current) => ({ ...current, [item.id]: body.items ?? [] }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "변경 이력을 불러오지 못했습니다.");
    } finally {
      setRevisionLoadingId("");
    }
  }

  useEffect(() => { void loadContents(); }, [loadContents]);

  return <section className="mt-8 rounded-2xl border border-line bg-white/60 p-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-display text-2xl">등록 콘텐츠</h2><p className="mt-1 text-sm text-ink/60">초안부터 공개까지 현재 저장된 콘텐츠와 출처 권리 상태를 확인하고 검수 상태를 변경합니다.</p></div><button type="button" onClick={() => void loadContents()} disabled={loading} className="rounded-xl border border-line px-4 py-2 text-sm disabled:opacity-50">새로고침</button></div>
    {loading && <p className="mt-5 text-sm text-ink/60">콘텐츠를 불러오는 중...</p>}
    {!loading && items.length === 0 && <p className="mt-5 rounded-xl bg-cream p-4 text-sm leading-6 text-ink/60">{message}</p>}
    {items.length > 0 && <div className="mt-5 space-y-3">{items.map((item) => <article key={item.id} className="rounded-xl border border-line bg-cream/60 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-ink/50">{item.kind} · {item.slug}</p><h3 className="mt-1 font-medium">{item.titleJa}</h3><p className="mt-1 text-sm text-ink/55">{item.koreanName}</p></div><span className="rounded-full bg-white px-3 py-1 text-xs">{item.status}</span></div><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/55"><span>최종 확인일: {item.lastVerifiedAt ?? "미확인"}</span><span>수정일: {new Date(item.updatedAt).toLocaleString("ko-KR")}</span>{item.sources?.map((source) => <span key={`${item.id}-${source.title}`}>출처 권리: {source.rightsStatus}</span>)}</div><div className="mt-4 flex flex-wrap items-end gap-3"><button type="button" onClick={() => onEdit(item)} className="min-h-10 rounded-xl border border-line px-4 text-sm">편집</button><label className="block min-w-44 text-sm">검수 상태<select aria-label={`${item.slug} 검수 상태`} value={draftStatuses[item.id] ?? item.status} onChange={(event) => setDraftStatuses((current) => ({ ...current, [item.id]: event.target.value as AdminContentItem["status"] }))} className="mt-2 min-h-10 w-full rounded-xl border border-line bg-white px-3"><option value="draft">초안</option><option value="review">검수 대기</option><option value="published">공개</option><option value="archived">보관</option></select></label><button type="button" onClick={() => void updateStatus(item)} disabled={busyId === item.id} className="min-h-10 rounded-xl bg-ink px-4 text-sm text-white disabled:opacity-50">{busyId === item.id ? "저장 중..." : "상태 저장"}</button><button type="button" onClick={() => void loadRevisions(item)} disabled={revisionLoadingId === item.id} className="min-h-10 rounded-xl border border-line px-4 text-sm disabled:opacity-50">{revisionLoadingId === item.id ? "불러오는 중..." : "변경 이력"}</button></div>{revisions[item.id] && <div className="mt-4 rounded-xl border border-line bg-white/70 p-4"><p className="text-sm font-medium">감사 이력</p>{revisions[item.id].length === 0 ? <p className="mt-2 text-sm text-ink/60">변경 이력이 없습니다.</p> : <ol className="mt-3 space-y-2 text-xs text-ink/60">{revisions[item.id].map((revision) => <li key={revision.revisionId} className="flex flex-wrap gap-x-3 gap-y-1"><span>{revision.action === "created" ? "생성" : "수정"}</span><span>상태: {revision.snapshot?.status ?? "미상"}</span><span>{new Date(revision.createdAt).toLocaleString("ko-KR")}</span><span>주체: {revision.updatedBy}</span></li>)}</ol>}</div>}</article>)}</div>}
    {message && items.length > 0 && <p className="mt-4 text-sm text-ink/60">{message}</p>}
  </section>;
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
      if (!response.ok) throw new Error(adminAccessMessage(response.status, body.message ?? "요청 목록을 불러오지 못했습니다."));
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
      if (!response.ok) throw new Error(adminAccessMessage(response.status, body.message ?? "요청 상태를 저장하지 못했습니다."));
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
