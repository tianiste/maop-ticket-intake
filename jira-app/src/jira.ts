// Jira REST calls made as the app (asApp), shared by the admin page and the issue-created trigger.
import api, { route } from "@forge/api";

export const UIM_NAME = "maop-intake-checks";

export interface UimDetails {
  id: string;
  name: string;
  data?: string;
  contexts?: { projectId?: string | null; issueTypeId?: string | null; viewType?: string | null }[];
}

export async function jira(path: ReturnType<typeof route>, init: { method?: string; body?: unknown } = {}) {
  const response = await api.asApp().requestJira(path, {
    method: init.method ?? "GET",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (!response.ok) throw new Error(`Jira ${init.method ?? "GET"} ${response.status}: ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

/** This app's UI modification (contexts and stored field ids), if the admin has saved one. */
export async function findOwnUim(): Promise<UimDetails | undefined> {
  const page = (await jira(route`/rest/api/3/uiModifications?expand=data,contexts&maxResults=100`)) as {
    values: UimDetails[];
  };
  return page.values.find((uim) => uim.name === UIM_NAME);
}
