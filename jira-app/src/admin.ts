// Backend for the admin page: chooses the projects and issue types whose create dialog runs
// the intake checks. A UI modification only renders for contexts registered through the
// UI modifications REST API, which only this app can call (asApp).
import api, { route } from "@forge/api";
import Resolver from "@forge/resolver";

const UIM_NAME = "maop-intake-checks";

export interface ProjectOption {
  id: string;
  key: string;
  name: string;
  issueTypes: { id: string; name: string }[];
}

export interface Context {
  projectId: string;
  issueTypeId: string;
}

interface UimDetails {
  id: string;
  name: string;
  contexts?: { projectId?: string | null; issueTypeId?: string | null; viewType?: string | null }[];
}

async function jira(path: ReturnType<typeof route>, init: { method?: string; body?: unknown } = {}) {
  const response = await api.asApp().requestJira(path, {
    method: init.method ?? "GET",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (!response.ok) throw new Error(`Jira ${init.method ?? "GET"} ${response.status}: ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

async function findOwnUim(): Promise<UimDetails | undefined> {
  const page = (await jira(route`/rest/api/3/uiModifications?expand=contexts&maxResults=100`)) as { values: UimDetails[] };
  return page.values.find((uim) => uim.name === UIM_NAME);
}

const resolver = new Resolver();

resolver.define("listProjects", async (): Promise<ProjectOption[]> => {
  const page = (await jira(route`/rest/api/3/project/search?expand=issueTypes&maxResults=100`)) as {
    values: { id: string; key: string; name: string; issueTypes?: { id: string; name: string; subtask: boolean }[] }[];
  };
  return page.values.map((project) => ({
    id: project.id,
    key: project.key,
    name: project.name,
    issueTypes: (project.issueTypes ?? []).filter((type) => !type.subtask).map(({ id, name }) => ({ id, name })),
  }));
});

resolver.define("getContexts", async (): Promise<Context[]> => {
  const uim = await findOwnUim();
  return (uim?.contexts ?? [])
    .filter((c) => c.viewType === "GIC" && c.projectId && c.issueTypeId)
    .map((c) => ({ projectId: c.projectId!, issueTypeId: c.issueTypeId! }));
});

resolver.define("saveContexts", async ({ payload }: { payload: { contexts: Context[] } }) => {
  const contexts = payload.contexts.map((c) => ({ projectId: c.projectId, issueTypeId: c.issueTypeId, viewType: "GIC" }));
  const existing = await findOwnUim();
  if (existing) {
    await jira(route`/rest/api/3/uiModifications/${existing.id}`, { method: "PUT", body: { contexts } });
  } else {
    await jira(route`/rest/api/3/uiModifications`, { method: "POST", body: { name: UIM_NAME, contexts } });
  }
  return { saved: contexts.length };
});

export const handler = resolver.getDefinitions();
