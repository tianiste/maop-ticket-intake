// Worker entry. /api/* is handled here; everything else is the Vue form from web/dist.

import { runValidation } from "./check";
import { deleteSubmission, insertSubmission, setJiraKey, setJiraTimes, stats, unresolvedJiraKeys } from "./db";
import type { Env } from "./env";
import { createIssue, fetchIssueTimes, jiraConfig } from "./jira";
import { handleJiraApp } from "./jiraApp";
import { isDepartment, RULES } from "./rules";
import { normalizeFields, type Ticket } from "./validate";

const SYNC_BATCH = 50;
const MAX_CHECKS = 1000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

async function readBody(request: Request): Promise<Record<string, unknown> | string> {
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) return "Body must be a JSON object.";
    return body as Record<string, unknown>;
  } catch {
    return "Body must be JSON.";
  }
}

function readTicket(body: Record<string, unknown>): Ticket | string {
  const { department, fields } = body;
  if (!isDepartment(department)) return 'department must be "it" or "engineering".';
  if (typeof fields !== "object" || fields === null || Array.isArray(fields)) return "fields must be an object.";
  return { department, fields: normalizeFields(department, fields as Record<string, unknown>) };
}

function rulesForForm() {
  return Object.fromEntries(
    Object.entries(RULES).map(([id, dept]) => [
      id,
      { label: dept.label, description: dept.description, fields: dept.fields.map(({ id, label, required, multiline }) => ({ id, label, required, multiline: !!multiline })) },
    ]),
  );
}

async function submit(request: Request, env: Env): Promise<Response> {
  const body = await readBody(request);
  if (typeof body === "string") return json({ error: body }, 400);
  const ticket = readTicket(body);
  if (typeof ticket === "string") return json({ error: ticket }, 400);
  if (ticket.fields.summary === "") return json({ error: "Kratek naslov je obvezen za oddajo." }, 400);

  const checks = body.checks;
  if (typeof checks !== "number" || !Number.isInteger(checks) || checks < 0 || checks > MAX_CHECKS) {
    return json({ error: "checks must be a whole number." }, 400);
  }
  const firstValid = body.firstValid;
  if (firstValid !== true && firstValid !== false && firstValid !== null && firstValid !== undefined) {
    return json({ error: "firstValid must be true, false or null." }, 400);
  }

  // The server checks again so the stored and Jira verdict does not depend on the browser.
  const result = await runValidation(env, ticket);
  const jira = jiraConfig(env);
  const id = await insertSubmission(env.DB, {
    ticket,
    checks,
    firstValid: checks > 0 ? (firstValid ?? null) : result.valid,
    result,
    jiraMode: jira ? "jira" : "demo",
  });

  if (!jira) {
    const key = `DEMO-${id}`;
    await setJiraKey(env.DB, id, key);
    return json({ key, mode: "demo", result });
  }

  try {
    const { key } = await createIssue(jira, ticket, result);
    await setJiraKey(env.DB, id, key);
    return json({ key, mode: "jira", url: `${jira.baseUrl}/browse/${key}`, result });
  } catch (err) {
    console.error("Jira create failed:", (err as Error).message);
    await deleteSubmission(env.DB, id);
    return json({ error: "Zahtevka ni bilo mogoče ustvariti v Jiri. Poskusite znova čez nekaj minut." }, 502);
  }
}

async function syncJira(env: Env): Promise<Response> {
  const jira = jiraConfig(env);
  if (!jira) return json({ mode: "demo", synced: 0, failed: 0 });
  let synced = 0;
  let failed = 0;
  for (const { id, key } of await unresolvedJiraKeys(env.DB, SYNC_BATCH)) {
    try {
      const times = await fetchIssueTimes(jira, key);
      await setJiraTimes(env.DB, id, times.createdAt, times.resolvedAt);
      synced++;
    } catch (err) {
      console.error("Jira sync failed:", (err as Error).message);
      failed++;
    }
  }
  return json({ mode: "jira", synced, failed });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    const route = `${request.method} ${pathname}`;

    switch (route) {
      case "GET /api/rules":
        return json({ departments: rulesForForm(), jira: jiraConfig(env) ? "jira" : "demo" });
      case "POST /api/validate": {
        const body = await readBody(request);
        if (typeof body === "string") return json({ error: body }, 400);
        const ticket = readTicket(body);
        if (typeof ticket === "string") return json({ error: ticket }, 400);
        return json(await runValidation(env, ticket));
      }
      case "POST /api/tickets":
        return submit(request, env);
      case "GET /api/stats":
        return json({ ...(await stats(env.DB)), jira: jiraConfig(env) ? "jira" : "demo" });
      case "POST /api/stats/sync":
        return syncJira(env);
    }

    if (pathname.startsWith("/api/jira/")) return handleJiraApp(request, env, route, json);
    if (pathname.startsWith("/api/")) return json({ error: "Not found." }, 404);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
