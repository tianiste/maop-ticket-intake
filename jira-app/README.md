# Jira app (Forge): intake checks in the Create dialog

A Forge app for Jira Cloud that shows the intake checks inside Jira's Create dialog. It calls the
existing Worker (`../src`) for the rules and the AI check; the web form keeps working unchanged.

**What it does:** in the Create dialog of the chosen projects and work types it runs the code
checks whenever a field changes and the AI check when the reporter leaves Description. The
result and follow-up questions go into the read-only paragraph field `Preverjanje`; each field's
ⓘ carries its question. Fields are matched by name (docs/jira-fields.md). Not yet: re-check after
create (label, comment, stats).

## Parts

- `manifest.yml`: modules, permissions, allowed Worker domains (`*.trycloudflare.com`, `*.workers.dev`).
- `static/uim/`: code that runs in the Create dialog (UI modifications, built with Vite to `dist/`).
- `src/uim.ts`: backend for the Create dialog (read-only Worker calls).
- `src/admin.ts`, `src/frontend/admin.tsx`: admin page (Jira settings -> Apps) to choose the
  projects and issue types whose Create dialog runs the checks. Checks appear only after saving here.
- `src/worker.ts`: Worker calls (`/api/jira/*`), with the `X-Intake-Secret` header.
- `src/shared.ts`: shapes shared by backend and dialog code, including the stored field ids.

## Build

```sh
cd jira-app
npm install
npm run build
```

## Run it (owner)

1. Install the Forge CLI and log in: `npm install -g @forge/cli`, then `forge login`
   (API token from id.atlassian.com).
2. In `jira-app/`: `npm install && npm run build`, then `forge register` (writes the app id into
   `manifest.yml`).
3. Make the Worker reachable: in the project root `npm run dev`, then in a second terminal
   `cloudflared tunnel --url http://localhost:8787`. Note the `https://....trycloudflare.com` URL.
4. Set the variables (development environment):
   - `forge variables set WORKER_URL https://<tunnel>.trycloudflare.com`
   - `forge variables set --encrypt WORKER_SECRET`: the same value as `JIRA_APP_SECRET` in the
     Worker's git-ignored `.env` / `.dev.vars` (the Worker's `/api/jira/*` stays closed without it)
5. `forge deploy`, then `forge install` (choose Jira and your site).
6. Create the fields from docs/jira-fields.md. Then Jira settings -> Apps -> **MAOP ticket
   intake**: tick the work types (Task of IP and IN), press **Shrani**. A yellow note lists work
   types without a `Preverjanje` field.
7. Open **Create**, choose IP, work type Task.

**Expected:** `Preverjanje` is read-only and lists what is missing; filling fields updates it;
leaving Description runs the AI check. `Preverjanje ni na voljo: ...` means the Worker was not
reached (the text says why). Nothing at all: run `forge logs` and check the browser console.

After a new tunnel URL: `forge variables set WORKER_URL ...` and `forge deploy` again.
