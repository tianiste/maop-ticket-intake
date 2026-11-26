# MAOP ticket intake

Seminarska naloga pri predmetu E-poslovanje: krajši čas obravnave zahtevkov v podjetju MAOP.

Avtorji: Rok Dobravec, Luka Bodlaj, Tian Istenič
Naročnik: Pavel Ilija, delni lastnik MAOP

## Problem

Čas obravnave zahtevkov v podjetju MAOP je predolg, ker zahtevki prispejo s premalo informacijami
in je potrebno dodatno spraševanje. Tipičen zahtevek je »Program mi ne dela.«, brez modula,
sporočila o napaki in korakov.

Trenutni potek:

1. Oddaja zahtevka s premalo informacijami
2. Prejemnik ugotovi, da manjka podatek
3. Dodatna vprašanja nazaj k oddajniku
4. Čakanje na odgovor
5. Šele nato reševanje

Koraki 2–4 so izgubljen čas.

## Cilji

- krajši čas obravnave zahtevkov
- manj dodatnih vprašanj med oddelki
- zahtevek takoj v pravem oddelku

## Rešitev

Pametni obrazec z AI preverjanjem popolnosti pred obstoječo Jiro:

```
Obrazec ──► AI preverjanje ──► Zahtevek v Jiri ──► Usmeritev
(opis       (je zahtevek       (prek API-ja)       (IT ali inženirski
 težave)     popoln?)                               oddelek)
```

Če podatek manjka, obrazec dodatna vprašanja postavi že ob oddaji. Zaposleni še naprej delajo v
obstoječem sistemu; dodamo le boljši vhod.

Obravnavane alternative: obvezna polja v Jiri brez AI ter nov sistem za zahtevke namesto obstoječega.

## Obseg

- obrazec z drugačnimi polji za IT in inženiring
- AI (hiter model, npr. Gemini Flash) vrne, kaj manjka
- zahtevek se ustvari prek Jira API-ja (na testnem sistemu)
- merimo čas obravnave in delež popolnih zahtevkov

## Dokumenti

- [`docs/MAOP_predstavitev_teme (1).pptx`](<docs/MAOP_predstavitev_teme (1).pptx>): predstavitev teme
- [`docs/decisions.md`](docs/decisions.md): odločitve
- [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md): znane omejitve
