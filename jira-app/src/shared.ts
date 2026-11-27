// Shapes shared by the backend and the create-dialog code.

/** Stored as the UI modification's data when the admin saves: Jira field ids by field name, per
 * "projectId:issueTypeId". The create dialog must register field ids synchronously, so it reads
 * them from here instead of looking them up. */
export interface UimData {
  v: 1;
  contexts: Record<string, { fields: Record<string, string> }>;
}

export const contextKey = (projectId: string, issueTypeId: string) => `${projectId}:${issueTypeId}`;

export function parseUimData(raw: string | undefined): UimData | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as UimData;
    return data?.v === 1 && typeof data.contexts === "object" ? data : null;
  } catch {
    return null;
  }
}

/** Name of the read-only paragraph field the app fills with the check result. */
export const CHECK_FIELD_NAME = "Preverjanje";

export interface RuleField {
  id: string;
  label: string;
  required: boolean;
  question: string;
  /** Long text: leaving it runs the AI check. */
  multiline: boolean;
}

export interface JiraRules {
  departments: Record<string, { label: string; projectKey: string | null; fields: RuleField[] }>;
}

export interface CheckResult {
  valid: boolean | null;
  missing: { field: string; label: string; reason: string; question: string; source: "form" | "ai" }[];
  ai: { checked: boolean; model: string | null; error?: string };
}

export type WorkerResult<T> = { ok: true; data: T } | { ok: false; error: string };

export const BULLET = "• ";

/** Plain text from a string or an Atlassian document (description and paragraph fields). */
export function plain(value: unknown): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  const node = value as { type?: string; text?: string; content?: unknown[] };
  if (node.type === "text") return node.text ?? "";
  const parts = (node.content ?? []).map(plain);
  const block = node.type === "doc" || node.type === "bulletList" || node.type === "orderedList";
  return parts.join(block ? "\n" : "");
}

/** Atlassian document from text: "• " lines become a bullet list, other lines paragraphs.
 * Paragraph fields with the rich-text editor reject plain strings. */
export function toAdf(text: string) {
  const paragraph = (value: string) => ({ type: "paragraph", content: [{ type: "text", text: value }] });
  const content: object[] = [];
  let list: object[] | null = null;
  for (const line of text.split("\n")) {
    if (line.startsWith(BULLET)) {
      if (!list) content.push({ type: "bulletList", content: (list = []) });
      list.push({ type: "listItem", content: [paragraph(line.slice(BULLET.length))] });
    } else {
      list = null;
      if (line) content.push(paragraph(line));
    }
  }
  return { version: 1 as const, type: "doc" as const, content };
}

/** Rule fields that are Jira's own fields; the rest are custom fields found by label. */
export const BUILT_IN: Record<string, string> = { summary: "summary", description: "description" };
