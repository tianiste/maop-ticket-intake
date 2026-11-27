// D1 access for submissions and statistics.

import type { Department } from "./rules";
import type { Ticket, ValidationResult } from "./validate";

const toDb = (valid: boolean | null) => (valid === null ? null : valid ? 1 : 0);
const fromDb = (value: number | null) => (value === null ? null : value === 1);

export interface NewSubmission {
  ticket: Ticket;
  /** null: unknown (tickets from the Jira app), never 0. */
  checks: number | null;
  firstValid: boolean | null;
  result: ValidationResult;
  jiraMode: "jira" | "demo";
  source: "form" | "jira";
}

export async function insertSubmission(db: D1Database, s: NewSubmission): Promise<number> {
  const row = await db
    .prepare(
      `INSERT INTO submissions
        (created_at, department, summary, fields_json, checks, first_valid, final_valid, missing_json, ai_model, jira_mode, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    )
    .bind(
      new Date().toISOString(),
      s.ticket.department,
      s.ticket.fields.summary,
      JSON.stringify(s.ticket.fields),
      s.checks,
      toDb(s.firstValid),
      toDb(s.result.valid),
      JSON.stringify(s.result.missing),
      s.result.ai.model,
      s.jiraMode,
      s.source,
    )
    .first<{ id: number }>();
  if (!row) throw new Error("insert returned no id");
  return row.id;
}

export async function setJiraKey(db: D1Database, id: number, key: string): Promise<void> {
  await db.prepare("UPDATE submissions SET jira_key = ? WHERE id = ?").bind(key, id).run();
}

export async function hasJiraKey(db: D1Database, key: string): Promise<boolean> {
  return (await db.prepare("SELECT 1 FROM submissions WHERE jira_key = ?").bind(key).first()) !== null;
}

export async function deleteSubmission(db: D1Database, id: number): Promise<void> {
  await db.prepare("DELETE FROM submissions WHERE id = ?").bind(id).run();
}

export async function unresolvedJiraKeys(db: D1Database, limit: number): Promise<{ id: number; key: string }[]> {
  const { results } = await db
    .prepare(
      `SELECT id, jira_key AS key FROM submissions
       WHERE jira_mode = 'jira' AND jira_key IS NOT NULL AND jira_resolved_at IS NULL
       ORDER BY jira_synced_at IS NOT NULL, jira_synced_at, id LIMIT ?`,
    )
    .bind(limit)
    .all<{ id: number; key: string }>();
  return results;
}

export async function setJiraTimes(db: D1Database, id: number, createdAt: string | null, resolvedAt: string | null) {
  await db
    .prepare("UPDATE submissions SET jira_created_at = ?, jira_resolved_at = ?, jira_synced_at = ? WHERE id = ?")
    .bind(createdAt, resolvedAt, new Date().toISOString(), id)
    .run();
}

interface Row {
  id: number;
  created_at: string;
  department: Department;
  summary: string;
  checks: number | null;
  first_valid: number | null;
  final_valid: number | null;
  missing_json: string;
  jira_mode: "jira" | "demo";
  jira_key: string | null;
  jira_created_at: string | null;
  jira_resolved_at: string | null;
  source: "form" | "jira";
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
  /** Web-form tickets only: Jira-app tickets have no known check count or first check. */
  averageChecks: number | null;
  /** Tickets created in Jira through the Forge app. */
  fromJiraApp: number;
  /** Only Jira tickets that are resolved; demo tickets have no handling time. */
  handling: { resolved: number; unresolved: number; demo: number; medianHours: number | null; averageHours: number | null };
}

function count(values: (boolean | null)[]): VerdictCounts {
  return {
    valid: values.filter((v) => v === true).length,
    invalid: values.filter((v) => v === false).length,
    unknown: values.filter((v) => v === null).length,
  };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function groupStats(rows: Row[]): GroupStats {
  const hours = rows
    .filter((r) => r.jira_resolved_at && r.jira_created_at)
    .map((r) => (Date.parse(r.jira_resolved_at!) - Date.parse(r.jira_created_at!)) / 3_600_000);
  const counted = rows.filter((r) => r.checks !== null);
  return {
    submissions: rows.length,
    firstCheck: count(counted.map((r) => fromDb(r.first_valid))),
    final: count(rows.map((r) => fromDb(r.final_valid))),
    averageChecks: counted.length ? counted.reduce((sum, r) => sum + r.checks!, 0) / counted.length : null,
    fromJiraApp: rows.filter((r) => r.source === "jira").length,
    handling: {
      resolved: hours.length,
      unresolved: rows.filter((r) => r.jira_mode === "jira" && !r.jira_resolved_at).length,
      demo: rows.filter((r) => r.jira_mode === "demo").length,
      medianHours: median(hours),
      averageHours: hours.length ? hours.reduce((a, b) => a + b, 0) / hours.length : null,
    },
  };
}

export async function stats(db: D1Database) {
  const { results } = await db
    .prepare(
      `SELECT id, created_at, department, summary, checks, first_valid, final_valid, missing_json,
              jira_mode, jira_key, jira_created_at, jira_resolved_at, source
       FROM submissions ORDER BY id DESC`,
    )
    .all<Row>();

  return {
    total: groupStats(results),
    it: groupStats(results.filter((r) => r.department === "it")),
    engineering: groupStats(results.filter((r) => r.department === "engineering")),
    recent: results.slice(0, 25).map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      department: r.department,
      summary: r.summary,
      checks: r.checks,
      firstValid: fromDb(r.first_valid),
      finalValid: fromDb(r.final_valid),
      missing: (JSON.parse(r.missing_json) as { label: string }[]).map((m) => m.label),
      jiraMode: r.jira_mode,
      jiraKey: r.jira_key,
      resolvedAt: r.jira_resolved_at,
      source: r.source,
    })),
  };
}
