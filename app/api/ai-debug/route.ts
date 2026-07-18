// TEMPORARY owner-only diagnostic for the AI brief. Delete once the brief works.
// Probes candidate NVIDIA models IN PARALLEL with a per-model timeout, and reports
// which the account can invoke (404 "not found for account" = no access). Never
// returns the key; auth-gated so only the signed-in owner can hit it.
import { requireUser } from "@/lib/auth";

const CANDIDATES = [
  "meta/llama-3.3-70b-instruct",
  "meta/llama-3.1-8b-instruct",
  "mistralai/mixtral-8x7b-instruct-v0.1",
  "nvidia/llama-3.1-nemotron-70b-instruct",
  "meta/llama-3.1-405b-instruct",
  "moonshotai/kimi-k2.6",
];

async function probe(key: string, endpoint: string, model: string) {
  const t0 = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const r = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Say OK." }],
        temperature: 0,
        max_tokens: 8,
        stream: false,
      }),
      signal: controller.signal,
    });
    const detail = r.ok ? "" : (await r.text()).slice(0, 120);
    return { model, status: r.status, ok: r.ok, ms: Date.now() - t0, detail };
  } catch (e) {
    return { model, error: e instanceof Error ? e.name : String(e), ms: Date.now() - t0 };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  await requireUser();
  const key = process.env.NVIDIA_API_KEY;
  const endpoint =
    process.env.AI_MAPPING_ENDPOINT ??
    "https://integrate.api.nvidia.com/v1/chat/completions";
  if (!key) return Response.json({ keyPresent: false });

  const results = await Promise.all(CANDIDATES.map((m) => probe(key, endpoint, m)));
  return Response.json({ keyPresent: true, endpoint, results });
}
