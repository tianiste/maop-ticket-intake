# Known limitations

What the project does not do yet, or does only approximately. Add every new known
limitation when it is found; remove it when it is fixed.

| Limitation | Effect for the user | Why / blocked on | Since |
|------------|---------------------|------------------|-------|
| Rules are sample rules | Tickets are judged against guessed rules, not MAOP's | Waiting for MAOP's examples of complete and incomplete tickets | 2026-11-26 |
| No live AI check done yet | Quality of AI verdicts on these rules is unknown | Owner runs live checks with the real key | 2026-11-26 |
| Free-tier Gemini | Prompts may be used by Google; occasional `503`; result is then `valid: null` | Use made-up tickets until the client agrees | 2026-11-26 |
| No CORS or auth on `/validate` | A form on another origin cannot call it yet; anyone with the URL could use the key quota | Form not built yet | 2026-11-26 |
