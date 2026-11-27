// Endpoints for the Forge Jira app (jira-app/). Every call must carry X-Intake-Secret equal to
// JIRA_APP_SECRET; without a configured secret the endpoints stay closed.

import { runValidation } from "./check";
import type { Env } from "./env";
import { isDepartment, RULES, type Department } from "./rules";
import { checkRequiredFields, mergeResults, normalizeFields, type Ticket } from "./validate";

type Json = (body: unknown, status?: number) => Response;

async function sha256(value: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
}

/** Compares hashes so the comparison takes the same time whatever the input length. */
async function secretMatches(given: string | null, expected: string): Promise<boolean> {
  if (!given) return false;
  const [a, b] = await Promise.all([sha256(given), sha256(expected)]);
  return crypto.subtle.timingSafeEqual(a, b);
}

function projectKeys(env: Env): Record<Department, string | null> {
  return { it: env.JIRA_PROJECT_IT || null, engineering: env.JIRA_PROJECT_ENGINEERING || null };
}

function rulesForJira(env: Env) {
  const keys = projectKeys(env);
  return Object.fromEntries(
    Object.entries(RULES).map(([id, dept]) => [
      id,
      {
        label: dept.label,
        projectKey: keys[id as Department],
        fields: dept.fields.map(({ id, label, required, question, multiline }) => ({ id, label, required, question, multiline: !!multiline })),
      },
    ]),
  );
}

export async function handleJiraApp(request: Request, env: Env, route: string, json: Json): Promise<Response> {
  if (!env.JIRA_APP_SECRET) return json({ error: "JIRA_APP_SECRET is not set." }, 503);
  if (!(await secretMatches(request.headers.get("x-intake-secret"), env.JIRA_APP_SECRET))) {
    return json({ error: "Unauthorized." }, 401);
  }

  switch (route) {
    case "GET /api/jira/rules":
      return json({ departments: rulesForJira(env) });

    case "POST /api/jira/validate": {
      let body: { department?: unknown; fields?: unknown; ai?: unknown };
      try {
        body = await request.json();
      } catch {
        return json({ error: "Body must be JSON." }, 400);
      }
      if (!isDepartment(body.department)) return json({ error: 'department must be "it" or "engineering".' }, 400);
      if (typeof body.fields !== "object" || body.fields === null || Array.isArray(body.fields)) {
        return json({ error: "fields must be an object." }, 400);
      }
      const ticket: Ticket = {
        department: body.department,
        fields: normalizeFields(body.department, body.fields as Record<string, unknown>),
      };
      if (body.ai === true) return json(await runValidation(env, ticket));
      // Code checks only (live typing): content rules stay unknown, never valid.
      return json(mergeResults(ticket, checkRequiredFields(ticket), { error: "AI check not requested" }));
    }
  }
  return json({ error: "Not found." }, 404);
}
