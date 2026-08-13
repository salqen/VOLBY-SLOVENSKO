# Výsledky komunálnych volieb 2022 — databáza a zber

Cieľová štruktúra vychádza z `BAvolby-git/src/db/schema.ts`, tabuľka
`election_results`. Zbiera sa po jednotlivých mestách a obciach.

---

## 1. Cieľová tabuľka

Bratislavský projekt drží výsledky v jednej dennormalizovanej tabuľke, kde je
kandidát uložený **menom, nie odkazom na osobu**. Pri historických výsledkoch
je to správne rozhodnutie: výsledok z roku 2022 je uzavretý fakt a nepotrebuje
väzbu na register osôb.

Prevzaté bez zmeny:

| Stĺpec | Typ | Poznámka |
|---|---|---|
| `year` | integer | `2022` |
| `race` | enum | viď nižšie |
| `candidateName` | varchar(160) | meno tak, ako ho uvádza zdroj |
| `votes` | integer | môže chýbať |
| `share` | real | percento, povinné |
| `turnout` | real | účasť v danej súťaži |
| `source` | text | povinné |

### Tri stĺpce, ktoré treba doplniť

Pri celoslovenskom zbere bratislavská podoba nestačí. Chýbajú tri veci a bez
nich sú dáta nepoužiteľné:

| Stĺpec | Typ | Prečo |
|---|---|---|
| `municipalityCode` | varchar(12) | Bratislavská tabuľka odkazuje na `districtId`, teda na mestskú časť. Celoslovensky treba obec — kód obce ŠÚ SR. |
| `party` | varchar(256) | Pri poslancoch je stranícka príslušnosť podstatná časť výsledku. Bez nej sa nedá povedať, kto zastupiteľstvo ovládol. |
| `elected` | boolean | Pri poslancoch nestačí poradie: mandát dostane toľko kandidátov, koľko je mandátov v obvode. Zo samotného počtu hlasov sa to bez znalosti počtu mandátov nedá odvodiť. |

`districtId` zostáva pre Bratislavu funkčný — mestské časti majú vlastný kód
obce, takže `municipalityCode` ho pokryje tiež.

### Hodnoty `race`

Podľa `raceEnum` bratislavského projektu:

| Hodnota | Použitie 2022 |
|---|---|
| `primator` | primátor mesta |
| `starosta` | starosta obce **a** starosta mestskej časti BA/KE |
| `poslanec_mz` | poslanci obecného alebo mestského zastupiteľstva |
| `poslanec_mz_mc` | poslanci miestneho zastupiteľstva mestskej časti |

Enum nerozlišuje starostu obce od starostu mestskej časti. Rozlíši ich typ
obce v registri, takže sa nemusí meniť.

---

## 2. Čo sa za rok 2022 zbiera

Pre každú obec:

1. **Starosta / primátor** — všetci kandidáti, ich hlasy, podiel; kto vyhral
2. **Poslanci zastupiteľstva** — všetci kandidáti, hlasy, strana; kto získal
   mandát
3. **Účasť** — percento a počet zapísaných voličov

Pri Bratislave a Košiciach navyše to isté za každú mestskú časť zvlášť, plus
celomestské súťaže.

Nezbiera sa: výsledky po okrskoch, preferencie, druhé kolá *(v komunálnych
voľbách sa nekonajú)*.

---

## 3. Zdroj — celé Slovensko je v šiestich súboroch

**`volby.statistics.sk`, komunálne voľby 2022.** Iný zdroj sa nepoužíva.
Novinárske súhrny ani weby obcí sa nepoužívajú ani na doplnenie — čísla sa
medzi zdrojmi líšia zaokrúhlením a vznikli by nezlučiteľné riadky.

Kľúčové zistenie: **rok 2022 sa nemusí zbierať po obciach.** Štatistický úrad
zverejňuje kompletné dáta ako tabuľky na stiahnutie, kde je **jeden riadok na
obec** — nie národný súhrn. Jedno stiahnutie nahradí ~2 890 návštev
jednotlivých stránok.

| Čo | Stránka | Súbor | Veľkosť |
|---|---|---|---|
| počet voličov a účasť podľa obcí | Súhrnné výsledky | `tab02bd.xlsx` | 278 kB |
| kandidáti na starostov podľa obcí | Zoznam kandidátov na starostu | `OSO2022_SK_tab0ad.xlsx` | 549 kB |
| kandidáti na starostov, BA a KE | tamtiež | `OSO2022_SK_tab0ax.xlsx` | 12 kB |
| kandidáti na poslancov podľa obcí | Zoznam kandidátov na poslancov | XLSX | 3,1 MB |
| **výsledky starostov podľa obcí** | Výsledky podľa obcí | XLSX | 554 kB |
| **výsledky kandidátov na poslancov** podľa volebných obvodov | Výsledky podľa obcí | XLSX | 3,2 MB |

Spolu necelých 8 MB. Obsahujú mená kandidátov aj počty hlasov za celé
Slovensko — teda presne to, čo portál potrebuje.

Doplnkovo sú k dispozícii aj tabuľky `tab03a1` a `tab03a2` — počet a podiel
zvolených starostov a poslancov podľa politických subjektov. Hodia sa na
kontrolu: ak sa nám počty zvolených po importe nezhodujú s nimi, niečo sa
stratilo.

---

## 4. Postup

Nie je to zber, je to import. Delenie práce po okresoch sa preto **na rok 2022
nepoužije.**

1. stiahnuť šesť súborov, uložiť do `raw_documents` doslova
2. rozparsovať, namapovať na kód obce
3. spustiť kontroly z časti 6
4. importovať nasucho, prezrieť rozdiel, zapísať

### Kedy sa predsa len ide po obciach

Zber po jednotlivých obciach zostáva len ako **záloha pre medzery**: keď sa
niektorá obec v tabuľkách nenájde, keď riadky nesedia s kontrolami, alebo keď
sa nepodarí spoľahlivo priradiť volebné obvody väčších miest. Vtedy sa použije
stránka „Výsledky podľa obcí“ pre konkrétnu obec.

V takom prípade platí rovnaké delenie ako pri kandidátoch — jeden pracovník =
jeden okres, mestské časti spracuje pracovník ich okresu, celomestské súťaže
Bratislavy a Košíc majú vlastné zadanie, vojenské obvody sa preskakujú.

Formát výstupu nižšie je spoločný pre import z tabuliek aj pre takýto
dozbieraný zvyšok.

---

## 5. Výstup

Súbor `vysledky2022-<okres-slug>.json`.

```jsonc
{
  "zadanie": "okres Levice",
  "rok": 2022,
  "zdroj": "Štatistický úrad SR — volby.statistics.sk",
  "obce": [
    {
      "code": "<kód obce>",
      "name": "Levice",
      "status": "hotove",
      "zdroj_url": "https://volby.statistics.sk/…",
      "ucast": {
        "voters": 26543,
        "ballots_cast": 8912,
        "turnout": 33.58
      },
      "sutaze": [
        {
          "race": "primator",
          "seats": 1,
          "kandidati": [
            {
              "name": "Ján Novák",
              "party": "nezávislý kandidát",
              "votes": 4210,
              "share": 47.24,
              "elected": true
            },
            {
              "name": "Eva Horváthová",
              "party": "Strana A",
              "votes": 3980,
              "share": 44.66,
              "elected": false
            }
          ]
        },
        {
          "race": "poslanec_mz",
          "seats": 19,
          "kandidati": []
        }
      ]
    }
  ]
}
```

`status`: `hotove` · `ciastocne` · `nenajdene`

**Každá obec okresu musí mať vlastný riadok**, aj keď sa výsledky nenašli.

---

## 6. Kontroly

Bez nich sa neimportuje.

| Kontrola | Očakávanie |
|---|---|
| počet obcí | = počet obcí v okrese |
| súčet `share` v súťaži | 99,5 – 100,5 % *(zaokrúhľovanie)* |
| `elected` pri starostovi | práve jeden na obec |
| `elected` pri poslancoch | = počet mandátov (`seats`) |
| víťaz | kandidát s najvyšším počtom hlasov má `elected: true` |
| `turnout` | 0 – 100 |
| `ballots_cast` ≤ `voters` | vždy |
| `turnout` vs. výpočet | zodpovedá `ballots_cast / voters` do 0,1 % |
| `votes` vs. `share` | vzájomne konzistentné do 0,5 % |
| mená | s diakritikou, nie verzálkami |

Pri poslancoch je kontrola počtu zvolených najdôležitejšia: je to jediné
miesto, kde sa dá odhaliť, že sa zoznam načítal len sčasti.

---

## 7. Pravidlá zápisu

- mená a strany **doslova zo zdroja**, bez opráv a bez prekladu
- keď zdroj uvádza meno verzálkami, prepíš na správne veľké písmená a diakritiku ponechaj
- nezávislý kandidát → `nezávislý kandidát`, nie prázdna hodnota
- koalícia → celý reťazec tak, ako ho uvádza zdroj
- chýbajúci údaj → `null`, nikdy `0`
- **nič sa nedopočítava** — ak zdroj neuvádza počet hlasov, `votes` zostáva
  `null` aj keď by sa dal odvodiť z podielu

Posledné pravidlo je dôležité: dopočítaný údaj vyzerá rovnako ako zmeraný,
ale nesie chybu zaokrúhlenia a pri kontrole súčtov potom nesedí nič.

---

## 8. Čo z toho vznikne

Po naplnení má **každá obec funkčný obsah** — kto ju vedie od roku 2022, ako
dopadli voľby a aká bola účasť. To je jediná časť portálu, ktorá sa dá mať
hotová bez ohľadu na to, kedy budú zverejnené kandidátne listiny.

Zároveň vzniká podklad na neskoršie párovanie osôb: mená z roku 2022 sú prvým
naplnením registra, do ktorého sa budú noví kandidáti napájať.

---

## 9. Doplnkové voľby 2022 – 2026

**Výsledok z roku 2022 nehovorí, kto obec vedie dnes.** Keď starosta odstúpi,
zomrie alebo sa obec rozdelí, konajú sa doplnkové voľby. Štatistický úrad ich
zverejňuje v samostatnej sekcii `oso/doplnkove2022` a od posledných riadnych
volieb ich bolo šesť kôl:

> september 2023 · február 2024 · október 2024 · marec 2025 · september 2025 ·
> marec 2026

Každé kolo má vlastné tabuľky (ODS, XLSX) a vlastný dátum zverejnenia.

Dôsledok pre portál: údaj „zvolený starosta“ na profile obce **musí brať
najnovší výsledok**, nie ten z roku 2022. Inak bude pri desiatkach obcí
uvedený človek, ktorý už funkciu nezastáva — a je to údaj, ktorý má návštevník
hneď pod titulkom.

Schéma na to nepotrebuje zmenu: každé kolo je ďalší riadok v `elections`
a jeho súťaže sa naviažu na tie isté obce. Pri zobrazení sa berie súťaž
s najneskorším `election_day`.

---

## 10. Overiť pre rok 2026

Za rok 2022 zverejnil štatistický úrad zoznamy kandidátov centrálne, jedným
súborom za celé Slovensko. **Ak to spraví aj pre voľby 2026, odpadne
najväčšia časť plánovaného zberu kandidátov** — paralelní pracovníci po
okresoch by boli zbytočná práca.

Treba preto sledovať, či a kedy sa na `volby.statistics.sk` objaví sekcia
volieb 2026 so zoznamami kandidátov, a až podľa toho spustiť zber podľa
`PROMPT-KANDIDATI.md`. Ten zostáva v platnosti pre prípad, že centrálny zoznam
nebude k dispozícii pred voľbami — čo je pravdepodobné, lebo úradné listiny
zverejňujú obce samy ~45 dní vopred.
