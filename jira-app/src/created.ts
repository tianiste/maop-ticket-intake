// Issue-created trigger: re-checks a ticket created through the Create dialog of an enabled
// project and work type, then writes the labels, the final "Preverjanje" text and, when the
// ticket is incomplete, a comment. The Worker stores it in the statistics once per Jira key.
// Jira events can arrive up to a few minutes late and more than once.
import { route } from "@forge/api";
import { findOwnUim, jira } from "./jira";
import {
  BUILT_IN,
  BULLET,
  CHECK_FIELD_NAME,
  contextKey,
  parseUimData,
  plain,
  toAdf,
  type CheckResult,
  type JiraRules,
} from "./shared";
import { callWorker } from "./worker";

interface CreatedEvent {
  issue?: { id?: string; key?: string };
}

interface Issue {
  key: string;
  fields: Record<string, unknown> & { project: { id: string; key: string }; issuetype: { id: string } };
}

interface Created {
  duplicate: boolean;
  result?: CheckResult;
  labels?: string[];
}

function verdictText(valid: boolean | null): string {
  if (valid === true) return "popoln";
  if (valid === false) return "nepopoln";
  return "ni preverjen (preverjanje z AI ni bilo na voljo)";
}

export async function handler(event: CreatedEvent): Promise<void> {
  const ref = event.issue?.key ?? event.issue?.id;
  if (!ref) return;

  const uim = await findOwnUim();
  const data = parseUimData(uim?.data);
  if (!uim || !data) return;

  const rules = await callWorker<JiraRules>("/api/jira/rules");
  if (!rules.ok) {
    console.error(`[created] rules: ${rules.error}`);
    return;
  }

  // Field ids stored by the admin page; fetch only what the check needs.
  const allIds = new Set<string>(Object.values(BUILT_IN));
  for (const ctx of Object.values(data.contexts)) Object.values(ctx.fields).forEach((id) => allIds.add(id));
  const issue = (await jira(
    route`/rest/api/3/issue/${ref}?fields=${["project", "issuetype", ...allIds].join(",")}`,
  )) as Issue;

  const { project, issuetype } = issue.fields;
  const enabled = (uim.contexts ?? []).some(
    (c) => c.viewType === "GIC" && c.projectId === project.id && c.issueTypeId === issuetype.id,
  );
  const names = data.contexts[contextKey(project.id, issuetype.id)]?.fields;
  const entry = Object.entries(rules.data.departments).find(([, d]) => d.projectKey === project.key);
  if (!enabled || !names || !entry) return; // not an intake project or work type
  const [department, dept] = entry;

  const fields: Record<string, string> = {};
  const jiraName: Record<string, string> = { summary: "Summary", description: "Description" };
  for (const field of dept.fields) {
    const id = BUILT_IN[field.id] ?? names[field.label];
    fields[field.id] = id ? plain(issue.fields[id]).trim() : "";
    if (!BUILT_IN[field.id]) jiraName[field.id] = field.label;
  }

  const created = await callWorker<Created>("/api/jira/created", {
    method: "POST",
    body: { department, fields, jiraKey: issue.key },
  });
  if (!created.ok) {
    console.error(`[created] ${issue.key}: ${created.error}`);
    return;
  }
  if (created.data.duplicate || !created.data.result) {
    console.log(`[created] ${issue.key}: already recorded`);
    return;
  }
  const { result, labels = [] } = created.data;

  const lines = [`Preverjeno po oddaji: zahtevek je ${verdictText(result.valid)}.`];
  for (const item of result.missing) lines.push(`${BULLET}${jiraName[item.field] ?? item.label}: ${item.question}`);
  const text = lines.join("\n");

  const checkFieldId = names[CHECK_FIELD_NAME];
  await jira(route`/rest/api/3/issue/${issue.key}`, {
    method: "PUT",
    body: {
      update: { labels: labels.map((label) => ({ add: label })) },
      ...(checkFieldId ? { fields: { [checkFieldId]: toAdf(text) } } : {}),
    },
  });

  if (result.valid === false) {
    const intro = "Zahtevek ni popoln. Prosimo, dopolnite ga z odgovori na ta vprašanja:";
    const body = toAdf([intro, ...lines.slice(1)].join("\n"));
    await jira(route`/rest/api/3/issue/${issue.key}/comment`, { method: "POST", body: { body } });
  }
  console.log(`[created] ${issue.key}: valid=${result.valid} missing=${result.missing.length}`);
}
