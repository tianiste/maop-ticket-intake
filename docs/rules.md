# Pravila za preverjanje zahtevkov

**Stanje (2026-11-26): vzorčna pravila.** Napisana so po predstavitvi teme (primer »Program mi ne
dela.« in obrazec s poljem »Program in verzija«), ne po podatkih naročnika. Ko MAOP pošlje primere
popolnih in pomanjkljivih zahtevkov, jih zamenjamo. Pravila so v kodi v `src/rules.ts`.

## Kako poteka preverjanje

1. **Koda** preveri obvezna polja. Prazno obvezno polje je takoj »manjka«, brez klica AI.
2. **AI** (Gemini, glej `FINDINGS.md`) za vsako preostalo pravilo presodi, ali ga zahtevek
   izpolnjuje. Gleda celoten zahtevek: podatek šteje, tudi če je v drugem polju.
   Pravilo, katerega glavno polje je obvezno in prazno, AI preskoči (ker ga je koda že javila).
3. Rezultat:
   - `valid: true`: vsa pravila izpolnjena,
   - `valid: false`: nekaj manjka (`missing` in `questions` povesta kaj),
   - `valid: null`: neznano, ker AI ni odgovoril (napaka, časovna omejitev). Neznano nikoli ne
     šteje kot »v redu«.

## IT (notranja podpora)

| Polje | Obvezno |
|---|---|
| Kratek naslov | da |
| Naprava ali storitev | da |
| Opis težave | da |
| Sporočilo o napaki | ne |
| Od kdaj | ne |

| Pravilo | Kaj preveri AI |
|---|---|
| `it.system` | jasno je, katera konkretna naprava, program, storitev ali račun |
| `it.problem` | opis pove, kaj se konkretno zgodi (»ne dela« ni dovolj) |
| `it.error` | besedilo napake ali izrecno »ni sporočila« |
| `it.since` | od kdaj težava traja |

## Inženiring (programi MAOP)

| Polje | Obvezno |
|---|---|
| Kratek naslov | da |
| Program in verzija | da |
| Modul | ne |
| Opis težave | da |
| Koraki za ponovitev | ne |
| Sporočilo o napaki | ne |
| Pričakovano delovanje | ne |

| Pravilo | Kaj preveri AI |
|---|---|
| `eng.program` | program, številka verzije in modul |
| `eng.problem` | konkreten opis dejanskega delovanja |
| `eng.steps` | koraki ali dejanje, po katerem se pojavi (ali »naključno«) |
| `eng.error` | besedilo napake ali izrecno »ni sporočila« |
| `eng.expected` | kaj bi se moralo zgoditi (lahko očitno iz opisa) |

## API

Obrazec uporablja:

| Pot | Namen |
|---|---|
| `GET /api/rules` | polja po oddelkih in ali je Jira povezana |
| `POST /api/validate` | preverjanje (spodaj) |
| `POST /api/tickets` | oddaja: strežnik še enkrat preveri, shrani v D1 in ustvari zahtevek v Jiri (ali demo ključ) |
| `GET /api/stats` | statistika in zadnji zahtevki |
| `POST /api/stats/sync` | prebere čase nastanka in rešitve iz Jire (do 50 zahtevkov naenkrat) |

`POST /api/validate`

```json
{
  "department": "engineering",
  "fields": {
    "summary": "Poročilo se ne naloži",
    "program": "Analitika 3.2",
    "module": "Poročila",
    "description": "Ko kliknem Prikaži, se poročilo ne naloži."
  }
}
```

Odgovor:

```json
{
  "valid": false,
  "department": "engineering",
  "missing": [
    {
      "rule": "eng.error",
      "field": "errorMessage",
      "label": "Sporočilo o napaki",
      "reason": "...",
      "question": "Ali se prikaže sporočilo o napaki? ...",
      "source": "ai"
    }
  ],
  "questions": ["Ali se prikaže sporočilo o napaki? ..."],
  "ai": { "checked": true, "model": "gemini-3.1-flash-lite" }
}
```

`field` pove, pri katerem polju obrazec izpiše vprašanje. `source` je `form` (prazno obvezno polje, preverila koda) ali `ai`. Neznana polja se zavržejo,
vsako polje je skrajšano na 5000 znakov.

## Oddaja in merjenje

- Zahtevek je mogoče oddati tudi nepopoln. Obrazec pred oddajo in po njej izpiše, kaj manjka;
  zahtevek v Jiri dobi seznam manjkajočega in oznako `nepopoln` (ali `nepreverjen`, če AI ni
  odgovoril). Oznake: `maop-intake`, `oddelek-it` / `oddelek-engineering`.
- V D1 se shrani: oddelek, naslov in polja, število preverjanj pred oddajo, rezultat prvega
  preverjanja (če ga ni bilo, rezultat ob oddaji), rezultat ob oddaji, kaj je manjkalo, Jira ključ.
- Čas obravnave = od nastanka do rešitve zahtevka v Jiri. Demo zahtevki ga nimajo (»ni podatka«).
