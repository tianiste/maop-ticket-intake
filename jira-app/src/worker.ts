// Calls to the intake Worker. WORKER_URL and WORKER_SECRET are Forge environment variables
// (forge variables set); the secret is sent only in the X-Intake-Secret header.
import { fetch } from "@forge/api";
import type { WorkerResult } from "./shared";

export async function callWorker<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<WorkerResult<T>> {
  const base = process.env.WORKER_URL;
  const secret = process.env.WORKER_SECRET;
  if (!base) return { ok: false, error: "WORKER_URL ni nastavljen" };
  if (!secret) return { ok: false, error: "WORKER_SECRET ni nastavljen" };

  try {
    const response = await fetch(new URL(path, base).toString(), {
      method: init.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Intake-Secret": secret,
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    if (!response.ok) return { ok: false, error: `Worker je vrnil ${response.status}` };
    return { ok: true, data: (await response.json()) as T };
  } catch (error) {
    return { ok: false, error: `Worker ni dosegljiv: ${error instanceof Error ? error.message : String(error)}` };
  }
}
