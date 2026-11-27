// Create-dialog checks (UI modifications). Code checks run whenever a field changes; the AI
// check runs when the reporter leaves the description. The result goes into the read-only
// "Preverjanje" field; each checked field's ⓘ carries its question.
import { view } from "@forge/bridge";
import { uiModificationsApi, type HookApi, type UiModification } from "@forge/jira-bridge";
import { call } from "../../../src/frontend/call";
import {
  CHECK_FIELD_NAME,
  contextKey,
  parseUimData,
  type CheckResult,
  type JiraRules,
  type RuleField,
  type WorkerResult,
} from "../../../src/shared";

/** Rule fields that are Jira's own fields; the rest are custom fields found by label. */
const BUILT_IN: Record<string, string> = { summary: "summary", description: "description" };

interface Setup {
  department: string;
  ruleFields: RuleField[];
  /** Rule field id -> Jira field id, for the fields present in this dialog. */
  jiraIds: Record<string, string>;
  /** Rule fields with no Jira field of the same name in this dialog. */
  absent: RuleField[];
  checkFieldId: string | undefined;
  descriptionLabel: string;
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
  const descriptionLabel = dept.fields.find((f) => f.id === "description")?.label ?? "Description";
  return { department, ruleFields: dept.fields, jiraIds, absent, checkFieldId: names[CHECK_FIELD_NAME], descriptionLabel };
}

/** Plain text from a string or an Atlassian document (description and paragraph fields). */
function plain(value: unknown): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  const node = value as { type?: string; text?: string; content?: unknown[] };
  if (node.type === "text") return node.text ?? "";
  const parts = (node.content ?? []).map(plain);
  const block = node.type === "doc" || node.type === "bulletList" || node.type === "orderedList";
  return parts.join(block ? "\n" : "");
}

function readFields(api: HookApi, setup: Setup): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const [ruleId, jiraId] of Object.entries(setup.jiraIds)) {
    fields[ruleId] = plain(api.getFieldById(jiraId)?.getValue()).trim();
  }
  for (const field of setup.absent) fields[field.id] = "";
  return fields;
}

function summarize(result: CheckResult, setup: Setup, aiRequested: boolean): string {
  const lines: string[] = [];
  if (result.valid === true) lines.push("Zahtevek je popoln.");
  else if (result.valid === false) {
    lines.push("Zahtevek ni popoln. Dopolnite:");
    for (const item of result.missing) lines.push(`${BULLET}${item.label}: ${item.question}`);
  } else if (aiRequested) {
    lines.push("Vsebine ni bilo mogoče preveriti (preverjanje z AI ni na voljo). Zahtevek lahko vseeno oddate.");
  } else {
    lines.push("Obvezna polja so izpolnjena.");
  }
  if (!result.ai.checked && !aiRequested) {
    lines.push(`Vsebino preverimo, ko zapustite polje »${setup.descriptionLabel}«.`);
  }
  if (setup.absent.length) {
    lines.push(`Polj ni v tem oknu (obvestite skrbnika): ${setup.absent.map((f) => f.label).join(", ")}.`);
  }
  return lines.join("\n");
}

const BULLET = "• ";

/** Atlassian document for a paragraph field: "• " lines become a bullet list, others paragraphs.
 * The rich-text editor in the create dialog rejects plain strings. */
function toAdf(text: string) {
  const content: object[] = [];
  let list: object[] | null = null;
  for (const line of text.split("\n")) {
    const paragraph = (value: string) => ({ type: "paragraph", content: [{ type: "text", text: value }] });
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

function show(api: HookApi, setup: Setup, text: string): void {
  if (!setup.checkFieldId) return;
  api.getFieldById(setup.checkFieldId)?.setValue(toAdf(text));
}

async function check(api: HookApi, setup: Setup, ai: boolean): Promise<void> {
  const result = await call<WorkerResult<CheckResult>>("validate", {
    department: setup.department,
    fields: readFields(api, setup),
    ai,
  });
  const text = result.ok ? summarize(result.data, setup, ai) : `Preverjanje ni na voljo: ${result.error}`;
  log(ai ? "check+ai" : "check", text);
  show(api, setup, text);
}

let current: Promise<Setup | string | null> | null = null;

uiModificationsApi.onInit(
  async ({ api, uiModifications }) => {
    current = setUp(uiModifications);
    const setup = await current;
    log("init", setup === null || typeof setup === "string" ? setup : {
      department: setup.department, jiraIds: setup.jiraIds, checkFieldId: setup.checkFieldId,
      absent: setup.absent.map((f) => f.id), registered: registeredIds(uiModifications),
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
      api.getFieldById(setup.checkFieldId)?.setReadOnly(true).setDescription("Izpolni se samodejno.");
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
    await check(api, setup, changedId === setup.jiraIds.description);
  },
  ({ uiModifications }) => registeredIds(uiModifications),
);

uiModificationsApi.onError(({ errors }) => {
  console.error("intake checks", errors);
  log("error", errors);
});
