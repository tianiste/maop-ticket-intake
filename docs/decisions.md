# Decisions

Why things are the way they are. Architecture decisions are presented to the owner first
(options, trade-offs, recommendation) and recorded here once the owner has chosen.
Newest first.

## 2026-11-27: Jira plugin as a Forge app beside the web form

- **Context:** The checks should appear inside Jira, not only in the separate web form.
- **Options:** Forge app (Jira Cloud); Data Center P2 plugin (Java); Jira Automation calling the
  Worker (no plugin). Recommended: Forge.
- **Chosen by the owner:**
  - Forge app for Jira Cloud in `jira-app/`, on branch `feat/jira-forge-app`; web form and Worker
    stay as they are. If MAOP runs Jira Data Center, the plugin must be rewritten.
  - Checks show in the Create dialog (UI modifications). Code checks run live; the AI check runs
    when the reporter leaves Description. UI modifications cannot block Create, so incomplete
    tickets can still be created (as in the web form).
  - After creation, an issue-created trigger re-checks the ticket, adds the `nepopoln` label and
    a comment with what is missing, and records it in D1 (events can take up to 3 minutes).
  - Department fields become Jira custom text fields that the owner creates from a list.
  - Check logic stays in the Worker; the Forge backend calls it with a shared secret header
    (`X-Intake-Secret`, a Forge encrypted variable).
  - An admin page in Jira settings chooses the projects and issue types (UI modifications only
    render for contexts the app registers through the UI modifications REST API).
  - Spike first: whether the Create-dialog code can call a Forge backend is not documented
    explicitly; a minimal app proves it before the full build.
- **Consequences:** the Worker must be reachable from Atlassian (tunnel in development, deploy
  later, both by the owner); its domain must be listed in `jira-app/manifest.yml`.

## 2026-11-26: Form, Jira, incomplete tickets and measurement

- **Form:** options were plain HTML+TS in the same Worker (recommended), Vue 3 + Vite in the same
  Worker, or a separate Pages site. **Chosen by the owner:** Vue 3 + Vite, served as static assets
  by the same Worker (`web/`), so the form and `/api/*` share one origin (no CORS).
- **Jira:** no test system yet. **Chosen:** Jira Cloud REST API v3 client that stays off until
  `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` and project keys are set. Until then tickets
  are stored only in D1 and get a clearly marked demo key (`DEMO-<n>`).
- **Incomplete tickets:** options were "may submit, marked incomplete" (recommended) or "cannot
  submit". **Chosen:** the person may submit; the form shows what is missing, and the ticket
  carries the missing list and label `nepopoln`.
- **Measurement:** options were D1 + times from Jira (recommended), only Jira, or later.
  **Chosen:** D1 (SQLite) stores each submission (department, first-check result, final result,
  number of checks, Jira key); handling time is read from Jira (created to resolution date) on
  demand. Demo tickets have no handling time (unknown, never 0).
- **Consequences:** the server re-validates on submit, so the stored and Jira verdict does not
  depend on the browser. The D1 database must be created by the owner before a deploy
  (`wrangler d1 create`); locally a local D1 is used. Revisit routing (label vs. separate Jira
  projects) once MAOP's Jira setup is known.

## 2026-11-26: AI validation runs in a Cloudflare Worker, code checks plus AI

- **Context:** The form needs a completeness check against MAOP's rules before a Jira ticket is
  created. The Gemini key must not reach the browser, so a server part is needed.
- **Options:**
  1. Cloudflare Worker (TypeScript): free hosting, key as a Worker secret; deploying needs the owner.
  2. Node + TypeScript server: simple locally, needs its own hosting.
  3. Python + FastAPI: same amount of code, separate stack from a later web form.
- **Recommended:** Node + TypeScript.
- **Chosen by the owner:** Cloudflare Worker.
- **Also chosen:** response is `valid` + what is missing + follow-up questions; empty required
  fields are checked in code, content rules are judged by the AI; rules are sample rules until
  MAOP provides examples of complete and incomplete tickets.
- **Consequences:** One endpoint `POST /validate` in `src/index.ts`; rules live in `src/rules.ts`
  and are described in `docs/rules.md`. If the AI fails, the result is `valid: null` (unknown),
  never valid. Revisit if Worker limits or Gemini latency make the form too slow.

## {{YYYY-MM-DD}}: {{decision title}}

- **Context:** {{the problem and the constraints}}
- **Options:**
  1. {{option}}: {{pros / cons}}
  2. {{option}}: {{pros / cons}}
- **Recommended:** {{option and why}}
- **Chosen by the owner:** {{option}}
- **Consequences:** {{what this commits us to; what would make us revisit it}}
