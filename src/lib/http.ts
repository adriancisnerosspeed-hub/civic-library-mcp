/** Small fetch wrapper: timeout, friendly upstream errors, JSON parsing. */

const DEFAULT_TIMEOUT_MS = 20_000;

export class UpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UpstreamError";
  }
}

export async function fetchJson<T = unknown>(
  url: string,
  opts: { source: string; timeoutMs?: number },
): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "civic-library-mcp" },
    });
    if (!res.ok) {
      throw new UpstreamError(`${opts.source} returned HTTP ${res.status}`);
    }
    const text = await res.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      // Census/FEMA return an HTML error page on some failures (e.g. a bad API key).
      throw new UpstreamError(`${opts.source} returned a non-JSON response (often a missing/invalid API key or an upstream outage)`);
    }
  } catch (err) {
    if (err instanceof UpstreamError) throw err;
    if ((err as Error).name === "AbortError") {
      throw new UpstreamError(`${opts.source} timed out after ${timeoutMs}ms`);
    }
    throw new UpstreamError(`${opts.source} request failed: ${(err as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}
