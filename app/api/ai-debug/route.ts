// TEMPORARY owner-only diagnostic for the AI brief. Delete once the brief works.
// Exercises the exact NVIDIA call server-side and reports why it succeeds or
// fails. Never returns the API key; auth-gated so only the signed-in owner can hit it.
import { requireUser } from "@/lib/auth";

export async function GET() {
  await requireUser();

  const key = process.env.NVIDIA_API_KEY;
  const endpoint =
    process.env.AI_MAPPING_ENDPOINT ??
    "https://integrate.api.nvidia.com/v1/chat/completions";
  const model = process.env.AI_MAPPING_MODEL ?? "moonshotai/kimi-k2.6";

  const out: Record<string, unknown> = {
    keyPresent: Boolean(key),
    keyLength: key?.length ?? 0,
    keyPrefixOk: key?.startsWith("nvapi-") ?? false,
    endpoint,
    model,
  };
  if (!key) return Response.json(out);

  const t0 = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
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
        messages: [{ role: "user", content: "Reply with the single word OK." }],
        temperature: 0,
        top_p: 1,
        max_tokens: 64,
        stream: false,
      }),
      signal: controller.signal,
    });
    out.httpStatus = r.status;
    out.elapsedMs = Date.now() - t0;
    const text = await r.text();
    out.bodyLength = text.length;
    out.bodySample = text.slice(0, 500);
    try {
      const j = JSON.parse(text) as {
        choices?: { message?: { content?: unknown }; finish_reason?: unknown }[];
      };
      out.contentSample =
        typeof j?.choices?.[0]?.message?.content === "string"
          ? (j.choices[0].message.content as string).slice(0, 200)
          : null;
      out.finishReason = j?.choices?.[0]?.finish_reason ?? null;
    } catch {
      out.parseError = true;
    }
  } catch (e) {
    out.elapsedMs = Date.now() - t0;
    out.errorType = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  } finally {
    clearTimeout(timer);
  }
  return Response.json(out);
}
