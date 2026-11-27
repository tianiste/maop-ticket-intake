# Jira fields for the intake checks

The Forge app (`jira-app/`) checks the same fields as the web form. Summary and Description are
Jira's own fields; the rest are custom fields the owner creates in each space. The app finds them
by **name**, so the names must match exactly (including č, š, ž).

Source of the list: `src/rules.ts` (sample rules). If the rules change, update this list.

## IT Podpora (`IP`, department `it`)

| Rule field | Jira field | Type |
|---|---|---|
| Kratek naslov | Summary (built in) | - |
| Opis težave | Description (built in) | - |
| Naprava ali storitev | custom | Short text |
| Sporočilo o napaki | custom | Paragraph |
| Od kdaj | custom | Short text |
| (check result) | **Preverjanje** | Paragraph |

## Inženiring (`IN`, department `engineering`)

| Rule field | Jira field | Type |
|---|---|---|
| Kratek naslov | Summary (built in) | - |
| Opis težave | Description (built in) | - |
| Program in verzija | custom | Short text |
| Modul | custom | Short text |
| Koraki za ponovitev | custom | Paragraph |
| Sporočilo o napaki | custom | Paragraph |
| Pričakovano delovanje | custom | Paragraph |
| (check result) | **Preverjanje** | Paragraph |

## How to add them (team-managed spaces)

For each space (IP, IN): Space settings -> Work types -> **Task** -> drag a *Short text* or
*Paragraph* field into the fields list, give it the name from the table, and save.

- Add them to **Task**, the work type the web form uses. Other work types can follow later.
- Do **not** mark them required in Jira: Jira would then block Create, while the rule is that an
  incomplete ticket may be submitted and is marked `nepopoln`. The app reports empty required
  fields itself.
- **Preverjanje** is filled by the app and shown read-only in the Create dialog.
