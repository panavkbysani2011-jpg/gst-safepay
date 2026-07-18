// TEMPORARY owner-only diagnostic for the AI brief. Delete once the brief works.
// Probes several NVIDIA models with the prod key and reports which the account
// can actually invoke (a 404 "not found for account" means no access). Never
// returns the key; auth-gated so only the signed-in owner can hit it.
import { requireUser } from "@/lib/auth";

const CANDIDATES = [
  process.env.AI_MAPPING_MODEL ?? "meta/llama-3.3-70b-instruct",
  "meta/llama-3.3-70b-instruct",
  "meta/llama-3.1-8b-instruct",
  "meta/llama-3.1-70b-instruct",
  "mistralai/mixtral-8x7b-instruct-v0.1",
  "nvidia/llama-3.1-nemotron-70b-instruct",
  "moonshotai/kimi-k2-instruct",
  "moonshotai/kimi-k2.6",
];

export async function GET() {
  await requireUser();

  const key = process.env.NVIDIA_API_KEY;
  const endpoint =
    process.env.AI_MAPPING_ENDPOINT ??
    "https://integrate.api.nvidia.com/v1/chat/completions";
  if (!key) return Response.json({ keyPresent: false });

  const seen = new Set<string>();
  const results: unknown[] = [];
  for (const model of CANDIDATES) {
    if (seen.has(model)) continue;
    seen.add(model);
    const t0 = Date.now();
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
      });
      const detail = r.ok ? "" : (await r.text()).slice(0, 140);
      results.push({ model, status: r.status, ok: r.ok, ms: Date.now() - t0, detail });
    } catch (e) {
      results.push({
        model,
        error: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
        ms: Date.now() - t0,
      });
    }
  }
  return Response.json({ keyPresent: true, endpoint, results });
}
