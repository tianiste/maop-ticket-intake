// Create-dialog checks (UI modifications). Code checks run whenever a field changes; the AI
// check runs when the reporter leaves the description or another long text field. The result
// goes into the read-only "Preverjanje" field; each checked field's ⓘ carries its question.
// Logs carry status only, never ticket text.
import { view } from "@forge/bridge";
import { uiModificationsApi, type HookApi, type UiModification } from "@forge/jira-bridge";
import { call } from "../../../src/frontend/call";
import {
  BULLET,
  BUILT_IN,
  CHECK_FIELD_NAME,
  plain,
  toAdf,
  contextKey,
  parseUimData,
  type CheckResult,
  type JiraRules,
  type RuleField,
  type WorkerResult,
} from "../../../src/shared";

interface Setup {
  department: string;
  ruleFields: RuleField[];
  /** Rule field id -> Jira field id, for the fields present in this dialog. */
  jiraIds: Record<string, string>;
  /** Rule fields with no Jira field of the same name in this dialog. */
  absent: RuleField[];
  checkFieldId: string | undefined;
  /** Jira field ids whose change runs the AI check (description and long text fields). */
  aiTriggerIds: Set<string>;
}

const log = (stage: string, detail?: unknown) => void call("log", { stage, detail }).catch(() => undefined);

let rules: Promise<WorkerResult<JiraRules>> | null = null;
const loadRules = () => (rules ??= call<WorkerResult<JiraRules>>("getRules"));

/** All field ids the admin page stored; registration must be synchronous. */
function registeredIds(uiModifications: UiModification[]): string[] {
  const ids = new Set<string>(Object.values(BUILT_IN));
  for (const uim of uiModifications) {
    const data = parseUimData(uim.data);
    for (const ctx of Object.values(data?.contexts ?? {})) Object.values(ctx.fields).forEach((id) => ids.add(id));
  }
  return [...ids];
}

async function setUp(uiModifications: UiModification[]): Promise<Setup | string | null> {
  const loaded = await loadRules();
  if (!loaded.ok) return loaded.error;

  const context = await view.getContext();
  const extension = context.extension as { project?: { id: string; key: string }; issueType?: { id: string } };
  if (!extension.project || !extension.issueType) return null;

  const entry = Object.entries(loaded.data.departments).find(([, d]) => d.projectKey === extension.project!.key);
  if (!entry) return null; // not an intake project
  const [department, dept] = entry;

  const key = contextKey(extension.project.id, extension.issueType.id);
  const names = uiModifications.map((u) => parseUimData(u.data)?.contexts[key]?.fields).find(Boolean) ?? {};

  const jiraIds: Record<string, string> = {};
  const absent: RuleField[] = [];
  for (const field of dept.fields) {
    const id = BUILT_IN[field.id] ?? names[field.label];
    if (id) jiraIds[field.id] = id;
    else absent.push(field);
  }
  const aiTriggerIds = new Set(
    dept.fields.filter((f) => (f.id === "description" || f.multiline) && jiraIds[f.id]).map((f) => jiraIds[f.id]),
  );
  return { department, ruleFields: dept.fields, jiraIds, absent, checkFieldId: names[CHECK_FIELD_NAME], aiTriggerIds };
}

function readFields(api: HookApi, setup: Setup): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const [ruleId, jiraId] of Object.entries(setup.jiraIds)) {
    fields[ruleId] = plain(api.getFieldById(jiraId)?.getValue()).trim();
  }
  for (const field of setup.absent) fields[field.id] = "";
  return fields;
}

type Item = CheckResult["missing"][number];

/** Last AI check of this dialog: the field values it judged and what it found. */
let lastAi: { fields: Record<string, string>; result: CheckResult } | null = null;

const same = (a: Record<string, string>, b: Record<string, string>) =>
  Object.keys({ ...a, ...b }).every((k) => (a[k] ?? "") === (b[k] ?? ""));

/** Name shown in the dialog for a rule field (Jira's own name, e.g. "Summary"). */
function fieldName(api: HookApi, setup: Setup, ruleFieldId: string, fallback: string): string {
  const id = setup.jiraIds[ruleFieldId];
  return (id && api.getFieldById(id)?.getName()) || fallback;
}

function aiFieldNames(api: HookApi, setup: Setup): string {
  return setup.ruleFields
    .filter((f) => setup.jiraIds[f.id] && setup.aiTriggerIds.has(setup.jiraIds[f.id]))
    .map((f) => `»${fieldName(api, setup, f.id, f.label)}«`)
    .join(", ");
}

/**
 * What to show after a code-only check: the code findings plus the last AI findings for fields
 * that have not changed since. valid stays unknown (null) while changed content is unchecked.
 */
function withLastAi(code: CheckResult, fields: Record<string, string>): { result: CheckResult; pending: boolean } {
  if (!lastAi) return { result: code, pending: true };
  if (same(lastAi.fields, fields)) return { result: lastAi.result, pending: false };
  const flagged = new Set(code.missing.map((m) => m.field));
  const kept = lastAi.result.missing.filter(
    (m: Item) => m.source === "ai" && !flagged.has(m.field) && (lastAi!.fields[m.field] ?? "") === (fields[m.field] ?? ""),
  );
  const missing = [...code.missing, ...kept];
  return { result: { ...code, missing, valid: missing.length > 0 ? false : null }, pending: true };
}

function summarize(api: HookApi, setup: Setup, result: CheckResult, aiFailed: boolean, pending: boolean): string {
  const lines: string[] = [];
  if (result.valid === true) lines.push("Zahtevek je popoln.");
  else if (result.valid === false) {
    lines.push("Zahtevek ni popoln. Dopolnite:");
    for (const item of result.missing) lines.push(`${BULLET}${fieldName(api, setup, item.field, item.label)}: ${item.question}`);
  } else if (aiFailed) {
    lines.push("Vsebine ni bilo mogoče preveriti (preverjanje z AI ni na voljo). Zahtevek lahko vseeno oddate.");
  } else {
    lines.push("Obvezna polja so izpolnjena.");
  }
  if (pending && !aiFailed) {
    lines.push(`Vsebino preveri AI, ko zapustite polje ${aiFieldNames(api, setup)} (nekaj sekund).`);
  }
  if (setup.absent.length) {
    lines.push(`Polj ni v tem oknu (obvestite skrbnika): ${setup.absent.map((f) => f.label).join(", ")}.`);
  }
  return lines.join("\n");
}

function show(api: HookApi, setup: Setup, text: string): void {
  if (!setup.checkFieldId) return;
  api.getFieldById(setup.checkFieldId)?.setValue(toAdf(text));
}

async function check(api: HookApi, setup: Setup, wantAi: boolean): Promise<void> {
  const fields = readFields(api, setup);
  // Nothing changed since the last AI check: reuse it instead of calling the AI again.
  const reuse = wantAi && lastAi !== null && same(lastAi.fields, fields);
  const ai = wantAi && !reuse;
  const response = await call<WorkerResult<CheckResult>>("validate", { department: setup.department, fields, ai });
  if (!response.ok) {
    log("check failed", response.error);
    show(api, setup, `Preverjanje ni na voljo: ${response.error}`);
    return;
  }

  let shown: CheckResult;
  let pending: boolean;
  const aiFailed = ai && !response.data.ai.checked;
  if (ai && response.data.ai.checked) {
    lastAi = { fields, result: response.data };
    shown = response.data;
    pending = false;
  } else {
    ({ result: shown, pending } = withLastAi(response.data, fields));
  }
  log(ai ? "check+ai" : reuse ? "check (ai reused)" : "check", {
    valid: shown.valid,
    missing: shown.missing.length,
    aiChecked: response.data.ai.checked,
    aiError: response.data.ai.error ?? null,
  });
  show(api, setup, summarize(api, setup, shown, aiFailed, pending));
}

let current: Promise<Setup | string | null> | null = null;

uiModificationsApi.onInit(
  async ({ api, uiModifications }) => {
    lastAi = null;
    current = setUp(uiModifications);
    const setup = await current;
    log("init", setup === null || typeof setup === "string" ? setup : {
      department: setup.department,
      found: Object.keys(setup.jiraIds).length,
      absent: setup.absent.map((f) => f.id),
      checkField: Boolean(setup.checkFieldId),
    });
    if (setup === null) return;
    if (typeof setup === "string") {
      api.getFieldById("summary")?.setDescription(`Preverjanje ni na voljo: ${setup}`);
      return;
    }
    for (const field of setup.ruleFields) {
      const id = setup.jiraIds[field.id];
      if (id) api.getFieldById(id)?.setDescription(field.question);
    }
    if (setup.checkFieldId) {
      api
        .getFieldById(setup.checkFieldId)
        ?.setReadOnly(true)
        .setDescription("Izpolni se samodejno. Preverjanje vsebine z AI traja nekaj sekund.");
    }
    await check(api, setup, false);
  },
  ({ uiModifications }) => registeredIds(uiModifications),
);

uiModificationsApi.onChange(
  async ({ api, change }) => {
    const setup = await current;
    if (!setup || typeof setup === "string") return;
    const changedId = change.current?.getId();
    if (!changedId || changedId === setup.checkFieldId) return;
    if (!Object.values(setup.jiraIds).includes(changedId)) return;
    await check(api, setup, setup.aiTriggerIds.has(changedId));
  },
  ({ uiModifications }) => registeredIds(uiModifications),
);

uiModificationsApi.onError(({ errors }) => {
  console.error("intake checks", errors);
  // Error entries name the method, field id and type; no field values.
  log("error", errors);
});
