// Jira Cloud REST API v3. Off (demo mode) until every setting is present.

import type { Env } from "./env";
import { RULES, type Department } from "./rules";
import type { Ticket, ValidationResult } from "./validate";

const TIMEOUT_MS = 10_000;

export interface JiraConfig {
  baseUrl: string;
  email: string;
  token: string;
  projects: Record<Department, string>;
  issueType: string;
}

export function jiraConfig(env: Env): JiraConfig | null {
  const { JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_IT, JIRA_PROJECT_ENGINEERING } = env;
  if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN || !JIRA_PROJECT_IT || !JIRA_PROJECT_ENGINEERING) return null;
  return {
    baseUrl: JIRA_BASE_URL.replace(/\/+$/, ""),
    email: JIRA_EMAIL,
    token: JIRA_API_TOKEN,
    projects: { it: JIRA_PROJECT_IT, engineering: JIRA_PROJECT_ENGINEERING },
    issueType: env.JIRA_ISSUE_TYPE || "Task",
  };
}

function headers(config: JiraConfig): HeadersInit {
  return {
    authorization: `Basic ${btoa(`${config.email}:${config.token}`)}`,
    accept: "application/json",
    "content-type": "application/json",
  };
}

// Atlassian Document Format helpers.
const text = (value: string, bold = false) => ({ type: "text", text: value, ...(bold ? { marks: [{ type: "strong" }] } : {}) });
const paragraph = (...content: object[]) => ({ type: "paragraph", content });
const heading = (value: string) => ({ type: "heading", attrs: { level: 3 }, content: [text(value)] });

export function verdictLabel(valid: boolean | null): string {
  if (valid === true) return "popoln";
  if (valid === false) return "nepopoln";
  return "ni preverjen (AI ni odgovoril)";
}

export function issueLabels(department: Department, valid: boolean | null): string[] {
  const labels = ["maop-intake", `oddelek-${department}`];
  if (valid === false) labels.push("nepopoln");
  if (valid === null) labels.push("nepreverjen");
  return labels;
}

function description(ticket: Ticket, result: ValidationResult): object {
  const content: object[] = [];
  for (const field of RULES[ticket.department].fields) {
    if (field.id === "summary") continue;
    const value = ticket.fields[field.id];
    content.push(heading(field.label));
    content.push(paragraph(text(value || "(ni vpisano)")));
  }
  content.push(heading("Preverjanje popolnosti"));
  content.push(paragraph(text("Rezultat: "), text(verdictLabel(result.valid), true)));
  if (result.missing.length > 0) {
    content.push({
      type: "bulletList",
      content: result.missing.map((m) => ({ type: "listItem", content: [paragraph(text(`${m.label}: `, true), text(m.reason))] })),
    });
  }
  return { type: "doc", version: 1, content };
}

export async function createIssue(config: JiraConfig, ticket: Ticket, result: ValidationResult): Promise<{ key: string }> {
  const response = await fetch(`${config.baseUrl}/rest/api/3/issue`, {
    method: "POST",
    headers: headers(config),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      fields: {
        project: { key: config.projects[ticket.department] },
        issuetype: { name: config.issueType },
        summary: ticket.fields.summary.slice(0, 255),
        description: description(ticket, result),
        labels: issueLabels(ticket.department, result.valid),
      },
    }),
  });
  if (!response.ok) throw new Error(`Jira create: HTTP ${response.status}`);
  const data = (await response.json()) as { key?: string };
  if (!data.key) throw new Error("Jira create: no issue key in response");
  return { key: data.key };
}

/** Jira returns offsets like +0100; make them ISO 8601 (+01:00) before parsing. */
function toIso(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const ms = Date.parse(value.replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

export async function fetchIssueTimes(
  config: JiraConfig,
  key: string,
): Promise<{ createdAt: string | null; resolvedAt: string | null }> {
  const response = await fetch(
    `${config.baseUrl}/rest/api/3/issue/${encodeURIComponent(key)}?fields=created,resolutiondate`,
    { headers: headers(config), signal: AbortSignal.timeout(TIMEOUT_MS) },
  );
  if (!response.ok) throw new Error(`Jira ${key}: HTTP ${response.status}`);
  const data = (await response.json()) as { fields?: { created?: unknown; resolutiondate?: unknown } };
  return { createdAt: toIso(data.fields?.created), resolvedAt: toIso(data.fields?.resolutiondate) };
}
