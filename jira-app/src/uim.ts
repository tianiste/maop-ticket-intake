// Backend for the create-dialog checks. Only read-only Worker calls live here, because any
// user who opens the create dialog can invoke these functions.
import Resolver from "@forge/resolver";
import type { CheckResult, JiraRules } from "./shared";
import { callWorker } from "./worker";

const MAX_FIELD_LENGTH = 5000;

const resolver = new Resolver();

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
