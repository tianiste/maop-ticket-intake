# Obogatena slika problema

Poglavje 2.2 seminarske naloge: obogatena slika (rich picture) obravnave zahtevkov v podjetju MAOP.

![Obogatena slika: obravnava zahtevkov v podjetju MAOP](<obogatena slika.png>)

Datoteke:

- [`obogatena slike.drawio`](<obogatena slike.drawio>): izvorna slika; odpri v <https://app.diagrams.net/>
  (File → Open from → Device).
- [`obogatena slika.png`](<obogatena slika.png>): slika za vstavljanje v Word. Po spremembi jo
  ponovno izvozi v diagrams.net: File → Export as → PNG (zoom 200 %).
- [`prejšnja verzija/`](<prejšnja verzija/>): prva verzija (SVG in PNG) in verzija v ročnem slogu
  (`obogatena-slika-skica.drawio` in `.png`).

Usmeritve: V. Pham, *Rich Pictures and CATWOE: Simple yet Powerful Scope-Modelling Techniques*,
Elabor8, 11. 8. 2014,
<https://www.elabor8.com.au/rich-pictures-and-catwoe-simple-yet-powerful-scope-modelling-techniques/>
(pregledano 27. 11. 2026). Obogatena slika nima predpisane notacije. Prikazuje sistem v širšem
smislu: ljudi, njihove odnose, skrbi in napetosti, ne le informacijski sistem. Prikazuje sedanje
stanje (AS-IS), ne rešitve. Članek jo dopolnjuje z vprašanji CATWOE (spodaj).

## Kaj slika prikazuje

Gre za zunanje zahtevke: zahtevek odda stranka, rešujeta ga IT in inženirski oddelek MAOP.
Podjetje MAOP je na sredini slike, stranka je zunaj. Sedanji potek obravnave zahtevka, oštevilčen kot v predstavitvi teme:

1. **Oddaja zahtevka.** Stranka (uporabnik pri kupcu MAOP) napiše zahtevek v prostem besedilu, npr.
   »Program mi ne dela.«, brez programa, verzije, modula, sporočila o napaki in korakov.
2. **Prejemnik ugotovi, da manjka podatek.** Nihče ob sprejemu ne preveri, ali je
   zahtevek popoln. Reševalec v IT ali inženirskem oddelku brez manjkajočih podatkov ne more začeti.
3. **Dodatna vprašanja** gredo nazaj k stranki.
4. **Čakanje na odgovor stranke.**
5. **Šele nato reševanje.** Koraki 2–4 so izgubljen čas.

Deležniki in njihove skrbi (oblački misli):

| Deležnik | Skrb |
|---|---|
| Pavel Ilija, delni lastnik (naročnik) | obravnava traja predolgo; želi manj dodatnih vprašanj in zahtevek takoj v pravem oddelku |
| Stranka: uporabnik pri kupcu MAOP (podjetja, javni sektor) | ne ve, katere podatke oddelek potrebuje; dodatna vprašanja jo motijo; dlje čaka na rešitev |
| Reševalec v IT oddelku | potrebuje napravo ali storitev, sporočilo o napaki, od kdaj težava traja |
| Reševalec v inženirskem oddelku | potrebuje program, verzijo, modul, korake za ponovitev, sporočilo o napaki |
| Drugi zaposleni MAOP: prodaja, uvajanje, administracija | v stiku s stranko; prodaja dobi vprašanje »kdaj bo rešeno?« (predpostavka) |

Napetosti (prekrižana meča):

- med stranko in reševalcem: dodatna vprašanja in čakanje povzročata frustracijo na obeh
  straneh;
- med IT in inženirskim oddelkom: zahtevek ni vedno takoj v pravem oddelku in ga je treba
  prestaviti.

## CATWOE

| | Vprašanje | MAOP |
|---|---|---|
| **C** Client (odjemalec) | Kdo ima korist ali škodo? | Stranke MAOP (podjetja, javni sektor), ki oddajajo zahtevke. Zdaj čakajo in odgovarjajo na dodatna vprašanja; z rešitvijo vprašanja dobijo že ob oddaji. |
| **A** Actors (izvajalci) | Kdo izvaja proces? | Stranke, ki izpolnijo obrazec; reševalci v IT in inženirskem oddelku, ki zahtevke rešujejo; prodaja, uvajanje in administracija, ki so s stranko v stiku. |
| **T** Transformation (preoblikovanje) | Kaj se iz česa naredi? | Vhod: težava stranke. Izhod: popoln zahtevek v pravem oddelku, ki ga je mogoče takoj reševati. |
| **W** World view (pogled na svet) | Zakaj je to pomembno? | Če zahtevek ob oddaji vsebuje vse potrebne podatke, odpadejo koraki 2–4 in obravnava je krajša. |
| **O** Owner (lastnik) | Kdo lahko spremembo podpre ali ustavi? | Pavel Ilija, delni lastnik MAOP. |
| **E** Environment (okolje) | Katere omejitve veljajo? | zaposleni ostanejo pri obstoječem načinu dela; 32 zaposlenih; zahtevki vsebujejo podatke strank (za AI preverjanje potrebujemo soglasje naročnika, varstvo podatkov); stroški in omejitve brezplačnih storitev. |

**Korenska definicija (root definition):** sistem, ki ga ima v lasti vodstvo MAOP in v katerem
stranke pri oddaji zahtevka že dobijo vprašanja o manjkajočih podatkih, da zahtevek
pride popoln in v pravi oddelek, s čimer se skrajša čas obravnave, ob omejitvi, da zaposleni
MAOP še naprej delajo v obstoječem sistemu.

## Kaj še potrdimo z naročnikom

Črtkano na sliki je predpostavka. Pred oddajo naloge potrdimo:

- kateri oddelki MAOP so v stiku s stranko, ko ta čaka (na sliki: prodaja, uvajanje, administracija);
- po kateri poti stranka odda zahtevek (spletni portal, e-pošta, telefon);
- kako pogosto zahtevek pride v napačen oddelek;
- po kateri poti gredo dodatna vprašanja (komentar na zahtevku, e-pošta, telefon) in koliko časa običajno
  traja odgovor.
