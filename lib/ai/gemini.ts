import "server-only";

/**
 * Thin wrapper over the Gemini REST API.
 *
 * Deliberately not the `@google/genai` SDK: the only three things this app
 * needs are a system prompt, a chat turn and JSON mode, and the REST surface
 * for those has been stable far longer than any SDK major. It also keeps the
 * install to zero extra dependencies, which matters when the whole point is
 * that a free API key is enough to run this.
 *
 * Nothing in here throws. Every entry point returns `null` when the key is
 * missing, the quota is spent, or the model returns something unusable, and
 * every caller has a deterministic fallback to run instead. A free-tier key is
 * 250 requests a day — running out must degrade the app, not break it.
 */

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash";

const MAX_ATTEMPTS = 3;
const RETRY_STATUS = new Set([408, 429, 500, 502, 503, 504]);

/**
 * How long we are willing to sit and wait when the API asks us to back off.
 *
 * A rate-limited response carries the cooldown it wants (`RetryInfo`), and on
 * the free tier that is routinely 30-60 seconds. Waiting that out is worse
 * than falling back — nobody watches a spinner for a minute — so past this
 * threshold we stop rather than retry.
 */
const MAX_HONOURED_RETRY_MS = 8_000;

export type Turn = { role: "user" | "model"; text: string };

/**
 * The subset of OpenAPI schema Gemini accepts for `responseSchema`. Kept
 * narrow on purpose — anything richer is silently ignored by the API and only
 * gives a false sense of what is being enforced. Zod does the real validation
 * on the way back in.
 */
export type ResponseSchema = {
  type: "object" | "array" | "string" | "number" | "integer" | "boolean";
  description?: string;
  nullable?: boolean;
  enum?: string[];
  format?: string;
  items?: ResponseSchema;
  properties?: Record<string, ResponseSchema>;
  required?: string[];
  propertyOrdering?: string[];
  minItems?: number;
  maxItems?: number;
};

export type GenerateOptions = {
  /** Persona and rules. Sent as `systemInstruction`, not as a chat turn. */
  system: string;
  /** The current question or instruction. */
  prompt: string;
  /** Prior turns, oldest first. Omitted for one-shot generation. */
  history?: Turn[];
  /** When set, the model is put in JSON mode and held to this shape. */
  schema?: ResponseSchema;
  temperature?: number;
  maxOutputTokens?: number;
  /**
   * How hard the model should think before answering. Omit to let it decide,
   * which is what the plan generators want; "low" keeps chat snappy.
   *
   * Model families disagree about this field — Gemini 3 takes `thinkingLevel`,
   * Gemini 2.5 took a numeric `thinkingBudget`, and some models reject the
   * values the others accept. Rather than hardcode a compatibility table that
   * will rot, a request rejected for this reason is retried without it (see
   * `request`). "low" is the one value accepted across every model tested.
   */
  thinkingLevel?: "low" | "high";
  timeoutMs?: number;
};

export function isAIConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function model(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

/**
 * One request, no retries. Returns the concatenated text of the answer, or
 * null if the response carried no usable text (blocked, truncated, empty).
 */
async function request(
  opts: GenerateOptions,
  signal: AbortSignal,
  withThinking = true,
): Promise<{
  text: string | null;
  status: number;
  rejectedThinking: boolean;
  /** The cooldown the server asked for, when it named one. */
  retryAfterMs: number | null;
  /** Why the model stopped. Null when the request never reached it. */
  finishReason: string | null;
}> {
  const apiKey = process.env.GEMINI_API_KEY!.trim();
  const name = model();

  const contents = [
    ...(opts.history ?? []).map((t) => ({
      role: t.role,
      parts: [{ text: t.text }],
    })),
    { role: "user" as const, parts: [{ text: opts.prompt }] },
  ];

  const generationConfig: Record<string, unknown> = {
    temperature: opts.temperature ?? 0.7,
    maxOutputTokens: opts.maxOutputTokens ?? 2048,
  };

  if (opts.schema) {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseSchema = opts.schema;
  }

  const sentThinking = withThinking && opts.thinkingLevel !== undefined;
  if (sentThinking) {
    generationConfig.thinkingConfig = { thinkingLevel: opts.thinkingLevel };
  }

  const response = await fetch(`${ENDPOINT}/${name}:generateContent`, {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      // Header rather than ?key= so the key never lands in a URL, and so it
      // stays out of any log or error message that echoes the request line.
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: opts.system }] },
      generationConfig,
    }),
  });

  if (!response.ok) {
    // A 400 while we were asking for a thinking level is almost always the
    // model refusing that field rather than anything wrong with the prompt.
    // Worth one retry without it before giving up on the request entirely.
    const rejectedThinking = response.status === 400 && sentThinking;
    const body = await response.json().catch(() => null);

    return {
      text: null,
      status: response.status,
      rejectedThinking,
      retryAfterMs: retryDelayFrom(body),
      finishReason: null,
    };
  }

  const data = await response.json();

  const parts: Array<{ text?: string; thought?: boolean }> =
    data?.candidates?.[0]?.content?.parts ?? [];

  // Thinking models return their reasoning as parts flagged `thought`. Those
  // are not the answer and must never reach the user.
  const text = parts
    .filter((p) => !p.thought && typeof p.text === "string")
    .map((p) => p.text)
    .join("")
    .trim();

  return {
    text: text.length > 0 ? text : null,
    status: response.status,
    rejectedThinking: false,
    retryAfterMs: null,
    finishReason: data?.candidates?.[0]?.finishReason ?? null,
  };
}

/**
 * Stop reasons that mean the model refused rather than stumbled. Retrying
 * these produces the same refusal and spends quota doing it.
 */
const REFUSALS = new Set([
  "SAFETY",
  "PROHIBITED_CONTENT",
  "BLOCKLIST",
  "RECITATION",
  "SPII",
]);

/**
 * Pulls the cooldown out of a Google API error. Rate-limit responses carry a
 * `RetryInfo` detail with a duration string like "51.666s"; without reading it
 * we would retry three times inside two seconds against a limit asking for
 * nearly a minute, spending three more requests of the quota we just ran out
 * of and failing anyway.
 */
function retryDelayFrom(body: unknown): number | null {
  const details = (body as { error?: { details?: unknown[] } })?.error?.details;
  if (!Array.isArray(details)) return null;

  for (const detail of details) {
    const d = detail as { "@type"?: string; retryDelay?: string };
    if (typeof d?.["@type"] === "string" && d["@type"].endsWith("RetryInfo")) {
      const seconds = Number.parseFloat(String(d.retryDelay ?? ""));
      if (Number.isFinite(seconds)) return Math.round(seconds * 1000);
    }
  }
  return null;
}

/**
 * Generate free-form text, retrying the failures that are worth retrying.
 *
 * Returning null is a normal outcome, not an exception: every caller has a
 * fallback. But a null that nobody can explain is impossible to operate, so
 * the reason is logged server-side before giving up.
 */
export async function generateText(
  opts: GenerateOptions,
): Promise<string | null> {
  if (!isAIConfigured()) return null;

  let lastStatus = 0;
  let lastReason: string | null = null;
  let attempt = 1;

  for (; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30_000);

    let waitMs: number | null = null;

    try {
      let result = await request(opts, controller.signal);

      if (result.rejectedThinking) {
        result = await request(opts, controller.signal, false);
      }

      if (result.text) return result.text;

      lastStatus = result.status;
      lastReason = result.finishReason;

      if (result.status === 200) {
        // A 200 carrying no text is usually a transient blip rather than a
        // verdict, so it is worth another go — unless the model refused, in
        // which case a retry earns the same refusal at the same price.
        if (result.finishReason && REFUSALS.has(result.finishReason)) {
          warn(opts, attempt, `model refused (${result.finishReason})`);
          return null;
        }
      } else if (!RETRY_STATUS.has(result.status)) {
        break;
      } else if (result.retryAfterMs !== null) {
        // Honour the server's own cooldown when it named one. If it is asking
        // for longer than we are prepared to wait, stop now — retrying sooner
        // cannot succeed and only spends more of the quota that ran out.
        if (result.retryAfterMs > MAX_HONOURED_RETRY_MS) {
          warn(
            opts,
            attempt,
            `rate limited, server asked for ${Math.round(result.retryAfterMs / 1000)}s`,
          );
          return null;
        }
        waitMs = result.retryAfterMs;
      }
    } catch {
      // Aborts and network errors are both worth one more go.
      lastStatus = 0;
    } finally {
      clearTimeout(timer);
    }

    if (attempt < MAX_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, waitMs ?? 400 * 2 ** (attempt - 1)));
    }
  }

  const why =
    lastStatus === 200
      ? `empty response (finishReason=${lastReason ?? "none"})`
      : lastStatus
        ? `HTTP ${lastStatus}`
        : "no response";

  warn(opts, Math.min(attempt, MAX_ATTEMPTS), why);
  return null;
}

/** Server-side only. Never logs the prompt — it carries the user's own data. */
function warn(opts: GenerateOptions, attempts: number, reason: string): void {
  console.warn(
    `[gemini] giving up after ${attempts} ${attempts === 1 ? "attempt" : "attempts"} ` +
      `(${reason}); model=${model()}, falling back. ` +
      `prompt=${opts.prompt.length} chars, schema=${opts.schema ? "json" : "text"}`,
  );
}

/**
 * Generate JSON and hand it to `validate` — in practice a Zod `safeParse`
 * wrapper. The model is held to `schema` on the way out and the result is
 * validated on the way in; a shape that fails validation is treated exactly
 * like a failed request, so the caller falls back rather than writing junk to
 * the database.
 */
export async function generateJSON<T>(
  opts: GenerateOptions & { validate: (value: unknown) => T | null },
): Promise<T | null> {
  // No thinking level by default: structured generation is where the extra
  // reasoning actually earns its latency. Callers that want speed ask for it.
  const raw = await generateText({ temperature: 0.4, ...opts });
  if (!raw) return null;

  try {
    return opts.validate(JSON.parse(stripFence(raw)));
  } catch {
    return null;
  }
}

/**
 * JSON mode returns bare JSON, but a model that ignores the mime type (or a
 * fallback model swapped in via GEMINI_MODEL) may wrap it in a code fence.
 * Cheap to tolerate, annoying to debug when it happens.
 */
function stripFence(text: string): string {
  const fenced = text.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/);
  return fenced ? fenced[1] : text;
}
