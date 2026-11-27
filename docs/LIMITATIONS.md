# Known limitations

What the project does not do yet, or does only approximately. Add every new known
limitation when it is found; remove it when it is fixed.

| Limitation | Effect for the user | Why / blocked on | Since |
|------------|---------------------|------------------|-------|
| Rules are sample rules | Tickets are judged against guessed rules, not MAOP's | Waiting for MAOP's examples of complete and incomplete tickets | 2026-11-26 |
| No live AI check done yet | Quality of AI verdicts on these rules is unknown | Owner runs live checks with the real key | 2026-11-26 |
| Free-tier Gemini | Prompts may be used by Google; occasional `503`; result is then `valid: null` | Use made-up tickets until the client agrees | 2026-11-26 |
| No access protection | Anyone with the URL can submit, see stats and recent ticket titles, and use the AI quota | Needs Cloudflare Access (or similar) at deploy, owner's choice | 2026-11-26 |
| Only tested against Jira Cloud (team-managed) | Behaviour on MAOP's own Jira (company-managed or Data Center) is unknown | Need to know which Jira MAOP uses | 2026-11-27 |
| Jira times are synced by hand | Handling time updates only when "Osveži čase iz Jire" is pressed (50 tickets per press) | No scheduled job yet | 2026-11-26 |
| First-check result and check count come from the browser | A modified client could report wrong values; the final verdict is re-checked on the server | Kept simple for an internal tool | 2026-11-26 |
| Full ticket fields are stored in D1 | Ticket text stays in the database with no retention limit | Needed to review examples later; agree retention with MAOP | 2026-11-26 |
| Remote D1 database does not exist yet | Deploy would fail until the owner creates it | Creating it changes the Cloudflare account (owner) | 2026-11-26 |
| Jira app: Create can't be blocked | Incomplete tickets can still be created from the Jira dialog | UI modifications have no submit hook | 2026-11-27 |
| Jira app: field help text hidden | Per-field questions show only behind the ⓘ icon; the full list is in the `Preverjanje` field | Jira's Create dialog layout | 2026-11-27 |
| Jira app: fields found by name | Renaming a field or adding one needs **Shrani** on the admin page again; until then it is reported as missing | Field ids must be registered before the dialog code runs | 2026-11-27 |
| Jira app: AI check runs only on leaving a long text field | Short fields (e.g. Program in verzija) are judged by the AI only at the next long-field exit; earlier AI findings stay shown until then | Limits Gemini calls | 2026-11-27 |
| Jira app: Jira Cloud only | A Data Center Jira would need a rewrite | Forge runs only on Cloud | 2026-11-27 |
| Jira app: re-check after create is delayed | Label, comment and final `Preverjanje` text appear up to ~3 minutes after Create | Jira delivers app events asynchronously | 2026-11-27 |
| Jira app: no check count for Jira tickets | Stats show "ni podatka" for first check and leave them out of the average number of checks | The dialog cannot pass its counts to the created ticket | 2026-11-27 |
| Jira app: `Preverjanje` editable on the ticket | Anyone can change the stored text after Create (read-only only in the Create dialog) | UI modification registered for Create only | 2026-11-27 |
| Jira app: Worker reached through a temporary tunnel | Tunnel URL changes on every restart; app needs `WORKER_URL` + deploy again | Real Worker deploy is the owner's step | 2026-11-27 |
