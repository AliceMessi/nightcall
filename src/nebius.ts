// Nebius Token Factory client with tier routing (OpenAI-compatible).
// Nano for fast/cheap structured steps, Ultra for deep reasoning. Key from env only.

export const TRIAGE_MODEL = "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B";
export const REASONING_MODEL = "nvidia/Nemotron-3-Ultra-550b-a55b";

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export type Tier = "triage" | "reasoning";

export function modelFor(tier: Tier, override?: string): string {
  if (override) return override;
  if (process.env.NEBIUS_MODEL) return process.env.NEBIUS_MODEL;
  return tier === "reasoning" ? REASONING_MODEL : TRIAGE_MODEL;
}

export async function callNemotron(
  messages: ChatMessage[],
  tier: Tier = "triage",
  opts: { model?: string; baseUrl?: string; apiKey?: string; maxTokens?: number } = {}
): Promise<{ text: string; model: string }> {
  const apiKey = opts.apiKey ?? process.env.NEBIUS_API_KEY ?? "";
  if (!apiKey) throw new Error("Missing NEBIUS_API_KEY");
  const baseUrl =
    opts.baseUrl ?? process.env.NEBIUS_BASE_URL ?? "https://api.tokenfactory.nebius.com/v1";
  const model = opts.model ?? modelFor(tier);

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: opts.maxTokens ?? 800,
    }),
  });
  if (!res.ok) throw new Error(`Nebius error ${res.status}`);
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: unknown } }> };
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty Nemotron response");
  return { text: String(text), model };
}
