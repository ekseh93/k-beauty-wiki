export function GET() {
  return Response.json({ ok: true, service: "k-beauty-atlas-japan-web", timestamp: new Date().toISOString() });
}
