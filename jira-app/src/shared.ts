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
