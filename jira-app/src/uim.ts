// Backend for the create-dialog checks. Only read-only Worker calls live here, because any
// user who opens the create dialog can invoke these functions.
import Resolver from "@forge/resolver";
import type { CheckResult, JiraRules } from "./shared";
import { callWorker } from "./worker";

const MAX_FIELD_LENGTH = 5000;

const resolver = new Resolver();

// Diagnostics from the create dialog (its console is not visible in forge logs).
resolver.define("log", ({ payload }: { payload: { stage: string; detail?: unknown } }) => {
  console.log(`[uim] ${String(payload.stage).slice(0, 100)}`, JSON.stringify(payload.detail ?? null).slice(0, 2000));
  return null;
});

resolver.define("getRules", () => callWorker<JiraRules>("/api/jira/rules"));

resolver.define(
  "validate",
  ({ payload }: { payload: { department: string; fields: Record<string, string>; ai: boolean } }) => {
    const fields = Object.fromEntries(
      Object.entries(payload.fields ?? {}).map(([id, value]) => [id, String(value).slice(0, MAX_FIELD_LENGTH)]),
    );
    return callWorker<CheckResult>("/api/jira/validate", {
      method: "POST",
      body: { department: payload.department, fields, ai: payload.ai === true },
    });
  },
);

export const handler = resolver.getDefinitions();
