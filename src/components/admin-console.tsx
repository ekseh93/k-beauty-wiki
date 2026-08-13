"use client";

import { useMemo, useState } from "react";
import { AuthenticationDetails, CognitoUser, CognitoUserPool, type CognitoUserSession } from "amazon-cognito-identity-js";

const poolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? "";
const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "";
const apiUrl = process.env.NEXT_PUBLIC_CONTENT_API_URL ?? "";

interface FormState {
  titleJa: string;
  koreanName: string;
  slug: string;
  summary: string;
  kind: "treatment" | "skincare" | "makeup";
  sourceUrl: string;
  lastVerifiedAt: string;
  status: "draft" | "review" | "published";
}

const initialForm: FormState = { titleJa: "", koreanName: "", slug: "", summary: "", kind: "skincare", sourceUrl: "", lastVerifiedAt: "", status: "draft" };

export function AdminConsole() {
  const configured = Boolean(poolId && clientId && apiUrl);
  const pool = useMemo(() => configured ? new CognitoUserPool({ UserPoolId: poolId, ClientId: clientId }) : null, [configured]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<CognitoUserSession | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pool) return;
    setBusy(true);
    const user = new CognitoUser({ Username: email, Pool: pool });
    user.authenticateUser(new AuthenticationDetails({ Username: email, Password: password }), {
      onSuccess: (nextSession) => { setSession(nextSession); setMessage("ログインしました。内容を保存できます。"); setBusy(false); },
      onFailure: (error) => { setMessage(error.message); setBusy(false); },
    });
  }

  async function saveContent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setBusy(true);
    setMessage("");
    const response = await fetch(`${apiUrl}/admin/content`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${session.getIdToken().getJwtToken()}` }, body: JSON.stringify({ ...form, body: [form.summary], tags: [], aliases: [], sources: form.sourceUrl ? [{ title: "入力された出典", url: form.sourceUrl, checkedAt: form.lastVerifiedAt }] : [], lastVerifiedAt: form.lastVerifiedAt || undefined, relatedSlugs: [] }) });
    const body = await response.json().catch(() => ({}));
    setMessage(response.ok ? "保存しました。公開前に出典と確認日を再確認してください。" : body.message ?? "保存できませんでした。");
    setBusy(false);
  }

  if (!configured) return <div className="mt-8 rounded-2xl border border-blush/60 bg-blush/15 p-6 text-sm leading-7 text-ink/70">CognitoとAPI Gatewayの環境変数が未設定です。デプロイ後に `NEXT_PUBLIC_COGNITO_USER_POOL_ID`、`NEXT_PUBLIC_COGNITO_CLIENT_ID`、`NEXT_PUBLIC_CONTENT_API_URL` を設定してください。</div>;
  if (!session) return <form onSubmit={signIn} className="mt-8 max-w-md rounded-2xl border border-line bg-white/60 p-6"><h2 className="font-display text-2xl">Cognitoログイン</h2><label className="mt-5 block text-sm">メールアドレス<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-line bg-cream px-3 outline-none focus:border-ink/50" /></label><label className="mt-4 block text-sm">パスワード<input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-line bg-cream px-3 outline-none focus:border-ink/50" /></label><button disabled={busy} className="mt-5 w-full rounded-xl bg-ink px-4 py-3 text-sm text-white disabled:opacity-50">{busy ? "確認中…" : "ログイン"}</button>{message && <p className="mt-4 text-sm text-ink/60">{message}</p>}</form>;

  return <form onSubmit={saveContent} className="mt-8 max-w-2xl rounded-2xl border border-line bg-white/60 p-6"><div className="flex items-center justify-between gap-4"><h2 className="font-display text-2xl">コンテンツを保存</h2><span className="rounded-full bg-sage/25 px-3 py-1 text-xs">Cognito認証済み</span></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="日本語タイトル" value={form.titleJa} onChange={(value) => setForm({ ...form, titleJa: value })} required /><Field label="韓国語原名" value={form.koreanName} onChange={(value) => setForm({ ...form, koreanName: value })} required /><Field label="slug" value={form.slug} onChange={(value) => setForm({ ...form, slug: value })} required /><label className="block text-sm">種類<select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as FormState["kind"] })} className="mt-2 min-h-11 w-full rounded-xl border border-line bg-cream px-3"><option value="treatment">施術</option><option value="skincare">スキンケア</option><option value="makeup">メイクアップ</option></select></label></div><label className="mt-4 block text-sm">一行要約<textarea required value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} className="mt-2 min-h-24 w-full rounded-xl border border-line bg-cream px-3 py-2" /></label><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="出典URL" value={form.sourceUrl} onChange={(value) => setForm({ ...form, sourceUrl: value })} required /><Field label="最終確認日" type="date" value={form.lastVerifiedAt} onChange={(value) => setForm({ ...form, lastVerifiedAt: value })} required /></div><label className="mt-4 block text-sm">状態<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as FormState["status"] })} className="mt-2 min-h-11 w-full rounded-xl border border-line bg-cream px-3"><option value="draft">下書き</option><option value="review">検証待ち</option><option value="published">公開</option></select></label><button disabled={busy} className="mt-6 rounded-xl bg-ink px-5 py-3 text-sm text-white disabled:opacity-50">{busy ? "保存中…" : "保存する"}</button>{message && <p className="mt-4 text-sm text-ink/60">{message}</p>}</form>;
}

function Field({ label, value, onChange, required, type = "text" }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string }) {
  return <label className="block text-sm">{label}<input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-line bg-cream px-3 outline-none focus:border-ink/50" /></label>;
}
