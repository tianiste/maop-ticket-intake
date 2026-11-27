// Backend for the create-dialog checks. Only read-only Worker calls live here, because any
// user who opens the create dialog can invoke these functions.
import Resolver from "@forge/resolver";
import { callWorker } from "./worker";

interface RulesResponse {
  departments: unknown[];
  jira: string;
}

const resolver = new Resolver();

resolver.define("pingWorker", async () => {
  const result = await callWorker<RulesResponse>("/api/rules");
  if (!result.ok) return result;
  return { ok: true, data: { departments: result.data.departments.length, mode: result.data.jira } };
});

export const handler = resolver.getDefinitions();
