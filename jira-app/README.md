# Jira app (Forge): intake checks in the Create dialog

A Forge app for Jira Cloud that shows the intake checks inside Jira's Create dialog. It calls the
existing Worker (`../src`) for the rules and the AI check; the web form keeps working unchanged.

**Current state: spike.** It only proves the path Create dialog -> Forge backend -> Worker. When
the dialog opens, the Summary field's help text says whether the Worker was reached.

## Parts

- `manifest.yml`: modules, permissions, allowed Worker domains (`*.trycloudflare.com`, `*.workers.dev`).
- `static/uim/`: code that runs in the Create dialog (UI modifications, built with Vite to `dist/`).
- `src/uim.ts`: backend for the Create dialog (read-only Worker calls).
- `src/admin.ts`, `src/frontend/admin.tsx`: admin page (Jira settings -> Apps) to choose the
  projects and issue types whose Create dialog runs the checks. Checks appear only after saving here.
- `src/worker.ts`: Worker calls, with the `X-Intake-Secret` header.

## Build

```sh
cd jira-app
npm install
npm run build
```

## Try the spike (owner)

1. Install the Forge CLI and log in: `npm install -g @forge/cli`, then `forge login`
   (API token from id.atlassian.com).
2. In `jira-app/`: `npm install && npm run build`, then `forge register` (writes the app id into
   `manifest.yml`).
3. Make the Worker reachable: in the project root `npm run dev`, then in a second terminal
   `cloudflared tunnel --url http://localhost:8787`. Note the `https://....trycloudflare.com` URL.
4. Set the variables (development environment):
   - `forge variables set WORKER_URL https://<tunnel>.trycloudflare.com`
   - `forge variables set --encrypt WORKER_SECRET` (enter any long random value; it prompts for it)
5. `forge deploy`, then `forge install` (choose Jira and your site).
6. Jira settings -> Apps -> **MAOP ticket intake**: tick the issue types of IP and IN, press **Shrani**.
7. Open **Create**, choose project IP.

**Expected:** under Summary the help text reads
`Preverjanje povezano (oddelkov: 2, način: jira)`.

- `Preverjanje ni na voljo: ...` -> the dialog reached the backend but not the Worker; the text says why.
- No help text at all -> the modification did not run or could not call the backend. Run
  `forge logs` and report the output, plus any errors in the browser console.

After a new tunnel URL: `forge variables set WORKER_URL ...` and `forge deploy` again.
