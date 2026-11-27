// Calls to the Worker API. Types mirror src/validate.ts and src/db.ts.

export type Department = "it" | "engineering";

export interface FormField {
  id: string;
  label: string;
  required: boolean;
  multiline: boolean;
}

export interface RulesResponse {
  departments: Record<Department, { label: string; description: string; fields: FormField[] }>;
  jira: "jira" | "demo";
}

export interface Missing {
  rule: string;
  field: string;
  label: string;
  reason: string;
  question: string;
  source: "form" | "ai";
}

export interface ValidationResult {
  valid: boolean | null;
  department: Department;
  missing: Missing[];
  questions: string[];
  ai: { checked: boolean; model: string | null; error?: string };
}

export interface SubmitResponse {
  key: string;
  mode: "jira" | "demo";
  url?: string;
  result: ValidationResult;
}

export interface VerdictCounts {
  valid: number;
  invalid: number;
  unknown: number;
}

export interface GroupStats {
  submissions: number;
  firstCheck: VerdictCounts;
  final: VerdictCounts;
  averageChecks: number | null;
  fromJiraApp: number;
  handling: { resolved: number; unresolved: number; demo: number; medianHours: number | null; averageHours: number | null };
}

export interface StatsResponse {
  total: GroupStats;
  it: GroupStats;
  engineering: GroupStats;
  recent: {
    id: number;
    createdAt: string;
    department: Department;
    summary: string;
    checks: number | null;
    firstValid: boolean | null;
    finalValid: boolean | null;
    missing: string[];
    jiraMode: "jira" | "demo";
    jiraKey: string | null;
    resolvedAt: string | null;
    source: "form" | "jira";
  }[];
  jira: "jira" | "demo";
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok || data === null) {
    throw new Error(data?.error ?? `Strežnik je vrnil napako ${response.status}.`);
  }
  return data;
}

export const api = {
  rules: () => request<RulesResponse>("/api/rules"),
  validate: (department: Department, fields: Record<string, string>) =>
    request<ValidationResult>("/api/validate", { department, fields }),
  submit: (department: Department, fields: Record<string, string>, checks: number, firstValid: boolean | null) =>
    request<SubmitResponse>("/api/tickets", { department, fields, checks, firstValid }),
  stats: () => request<StatsResponse>("/api/stats"),
  syncJira: () => request<{ mode: "jira" | "demo"; synced: number; failed: number }>("/api/stats/sync", {}),
};
