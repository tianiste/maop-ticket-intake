# Findings

## 2026-11-27: Forge spike in the Jira Create dialog

Forge app `jira-app/` (spike), deployed to the development environment and installed on the
Jira Cloud test site. Forge CLI 16.0.0 on Node 24.

| Check | Result |
|---|---|
| Admin page (Jira settings -> Apps) | Lists spaces with issue types; saving registered 8 contexts (IP, IN x Epic/Story/Bug/Task) through the UI modifications REST API |
| Create dialog -> Forge backend (`invoke` from UI modifications) | Works: Summary help text showed the backend's answer ("WORKER_URL ni nastavljen", expected without a Worker) |
| Where help text appears | Not under the field: behind an ⓘ icon next to the label, visible only on hover or click |
| Forge -> Worker | Not checked yet (no tunnel / WORKER_URL) |

Notes: `forge register` needs a Developer Space, created by the owner interactively (the CLI
forces non-interactive mode when run by an agent). Forge bundles TypeScript with the app's
`tsconfig.json`, so it must not set `noEmit`. An empty pop-up at the bottom left of Jira appeared
during the check; cause unknown.

## 2026-11-27: Live check against Jira Cloud and Gemini

Test site: Jira Cloud Free, two team-managed Kanban spaces (`IP` IT Podpora, `IN` Inženiring),
classic API token. Made-up test tickets, submitted through the local Worker (`wrangler dev`).

| Check | Result |
|---|---|
| Login (`/rest/api/3/myself`) | 200 |
| Project keys | Jira picked `IP` and `IN` itself, not the typed `IT`/`ENG`; check keys after creating spaces |
| Issue types | `Epic`, `Story`, `Bug`, `Task`; `Task` used |
| AI check, "Program mi ne dela." (engineering) | `valid:false`, 5 sensible items and questions in Slovenian, 1.6 s, `gemini-3.1-flash-lite` |
| AI check, complete IT ticket | `valid:true`, 6.0 s |
| Create issue | `IN-1`, `IP-1` created in the right project; ADF description, fields, "Preverjanje popolnosti" section and labels (`maop-intake`, `oddelek-*`, `nepopoln`) correct |
| Resolution date | Moving to Done in a team-managed space sets `resolution` and `resolutiondate`; sync read it and stats showed the handling time |

Notes: in the newer Jira UI "projects" are called "spaces"; the API still says `project`.

## 2026-11-26: Which Gemini model to use for the completeness check

**Recommendation:** `gemini-3.1-flash-lite`, with `gemini-flash-lite-latest` as the fallback.

### How it was tested

- Google AI Studio API key on the free tier (stored in the git-ignored `.env` as `GOOGLE_AI_API_KEY`).
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent`,
  key sent in the `x-goog-api-key` header.
- Same prompt for every model: the ticket "Program mi ne dela." for the engineering department,
  asking for JSON `{"complete": bool, "missing": [...]}` with missing items in Slovenian.
- `generationConfig.responseMimeType` set to `application/json`.
- Working models were called three times each to compare response times.

### Results

| Model | Result | Time per call | What it flagged as missing |
|---|---|---|---|
| `gemini-3.1-flash-lite` | works | about 0.8–6 s (first call took 31 s) | 4 items, e.g. error description, steps to reproduce, program, version |
| `gemini-flash-lite-latest` | works | about 1.4–2.7 s, steady | 3 items |
| `gemini-3-flash-preview` | works | about 3 s, steady | 5 items, the most thorough |
| `gemma-4-26b-a4b-it` | works | about 9 s | too slow for a form |
| `gemini-flash-latest`, `gemini-3.5-flash`, `gemini-3.6-flash`, `gemini-3.7-flash`, `gemini-3.8-flash` | failed | — | `503 UNAVAILABLE` ("high demand") on every call |
| `gemini-2.5-flash`, `gemini-2.5-flash-lite` | failed | — | `404` "no longer available to new users" |
| `gemini-3.5-flash-lite` | failed | — | `403 PERMISSION_DENIED`, says the Gemini API is not enabled for the project, although other models work with the same key |

All three working models returned valid JSON with sensible missing items in Slovenian.

### Why this choice

- `gemini-3.1-flash-lite` is the cheapest class, gave useful results and was usually under a
  second. Its slow first call looks like a cold start.
- `gemini-flash-lite-latest` had the steadiest response times, which makes it a good automatic
  fallback when the first model errors or is slow.
- If the quality of the missing-items list is not good enough, `gemini-3-flash-preview` is the
  next step up, at about 3 s per call.

### Notes for the implementation

- Set a timeout of about 10 s per call so a slow call cannot hang the form, then fall back to the
  second model.
- `503` "high demand" errors are temporary but will happen sometimes on the free tier.
- On the free tier Google may use prompts to improve its products. Use made-up test tickets;
  sending real MAOP tickets needs the client's agreement.
- Free-tier limits and model availability change often; rerun this check before relying on it.
