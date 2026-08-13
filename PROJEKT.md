# Volebný portál pre viac miest — projektový plán

Nový projekt na novej doméne. Pokrýva komunálne **aj** župné voľby vo viacerých
mestách. Bratislava zostáva na `bratislavskevolby.sk` ako samostatná značka
a zároveň je súčasťou tohto portálu.

Stav: **zámer**, nezačaté. Priečinok sa premenuje podľa zvolenej domény.

---

## 1. Časový rámec — čítať ako prvé

| Míľnik | Dátum | Zostáva |
|---|---|---|
| dnes | 12. 8. 2026 | — |
| kandidátne listiny zverejnené | ~9. 9. 2026 | **4 týždne** |
| voľby | 24. 10. 2026 | **73 dní** |

Toto je hlavný fakt celého plánu. Do zverejnenia kandidátnych listín zostávajú
štyri týždne — dovtedy musí stáť dátový základ, inak nebude kam kandidátov
uložiť. Do volieb zostáva desať týždňov.

**Dôsledok:** postaviť plnohodnotný portál pre desať miest do volieb nie je
reálne. Plán preto stojí na tom, čo sa stihnúť dá, a zvyšok vedome odkladá za
voľby. Rozsah je vec rozhodnutia — viď časť 6.

---

## 2. Cieľ

Jeden portál, kde si volič v ktoromkoľvek zapojenom meste nájde:

- kto kandiduje na primátora, starostu, predsedu kraja a poslancov
- kde má voliť
- ako dopadli minulé voľby
- čím sa kandidáti líšia

Bratislavský portál sa nezahadzuje — jeho kód, dizajn aj obsah sú základom
tohto projektu.

---

## 3. Čo je už hotové a prenáša sa

Z `BAvolby-git` sa preberá prakticky celý portál:

- Next.js 16 + React 19 + Drizzle + Neon, nasadené na Verceli
- dizajn systém, tmavý a senior režim, prepínač farebnej témy podľa erbu
- sekcie: kandidáti, porovnávač, témy, sľuby, fact-check, výsledky, analýzy,
  aktuality, Môj okrsok, sprievodca, FAQ, podnety
- RSS scraper aktualít vrátane právnych pravidiel
- revízny režim na pripomienkovanie
- návrh viac-mestovej schémy a zberu dát
  (`BAvolby-git/docs/scraping-schema.md`, `nove-mesto-navod.md`)

**Nezačína sa od nuly.** Hlavná práca je prestavba jednomestskej schémy na
viacmestskú a naplnenie dátami.

---

## 4. Fázy

### Fáza 0 — Rozhodnutia (dni, blokuje všetko)

Doména, zoznam miest do prvého kola, rozsah do volieb. Bez toho sa nedá začať.

### Fáza 1 — Základ (2 týždne)

Kópia repozitára, prestavba schémy podľa `scraping-schema.md`: geografia
(kraj → okres → obec → MČ → obvod → okrsok), `elections` + `races`, rozdelenie
`candidates` na `people` + `candidacies`, `municipality_id` v obsahu.
Smerovanie: hlavná doména s mestom v ceste + `bratislavskevolby.sk` bez prefixu
a s kanonickou adresou.

Naplniť číselníky obcí, okresov a krajov zo ŠÚ SR.

### Fáza 2 — Výsledky 2022 (3 dni, celoslovensky naraz)

Import výsledkov a účasti zo `volby.statistics.sk`. Jeden súbor pokrýva všetky
obce naraz.

**Po tejto fáze má každé mesto funkčný obsah, ešte pred tým, než sú známi
kandidáti.** Najlepší pomer prínosu k práci v celom projekte.

### Fáza 3 — Formát importu (týždeň)

Bundle + Zod validátor + suchý beh s výpisom rozdielu. Bez neho sa dáta
nedostanú dnu inak než ručne, čo pri viacerých mestách neobstojí.

### Fáza 4 — Druhé mesto (týždeň)

**Košice.** Majú mestské časti, teda overia rovnakú vetvu ako Bratislava. Keby
sme začali mestom bez mestských častí, otestujeme len jednoduchší prípad
a na zložitejší narazíme neskoro.

### Fáza 5 — Kandidáti (od 9. 9., priebežne)

Prepis kandidátnych listín miest aj krajov. Pri spojených voľbách má mesto
štyri súťaže, Bratislava a Košice šesť.

### Fáza 6 — Župné voľby (dni)

Vloženie súťaží `predseda_vuc` a `poslanec_vuc`. Schéma sa nemení — je to
dátová operácia. Krátke práve preto, že sa to zohľadnilo v návrhu.

### Fáza 7 — Okrsky (týždne, po mestách)

Extrakcia z PDF do návrhu + povinné ručné potvrdenie. Kým mesto nie je
potvrdené, „Môj okrsok“ preň zostáva vypnutý.

**Toto je najdrahšia časť projektu** a jediná, ktorá rastie lineárne s počtom
miest.

### Fáza 8 — Obsah a aktuality (priebežne)

RSS zdroje miestnych médií, analýzy, profily. Sprievodca, FAQ a pravidlá sa
píšu raz pre celé Slovensko.

### Po voľbách

Archív výsledkov 2026, sledovanie sľubov, rozšírenie na ďalšie mestá bez
časového tlaku.

---

## 5. Riziká

| Riziko | Dopad | Čo s tým |
|---|---|---|
| **Nestihne sa termín** | portál bez obsahu v deň volieb | znížiť počet miest, nie kvalitu |
| **Okrsky sa nedajú stihnúť** | chýba najžiadanejšia funkcia | vypnúť po mestách, nie zverejniť nesprávne |
| **Mestá zverejnia okrsky neskoro** | tlak na koniec | rátať s tým, nie plánovať proti tomu |
| **Párovanie osôb** | dvaja ľudia zlúčení do jedného | ručné potvrdenie pod prahom istoty |
| **Duplicita Bratislavy** | dve adresy si zoberú pozície | kanonická adresa hneď v Fáze 1 |
| **Redakčná kapacita** | prázdne sekcie | radšej menej miest s obsahom |
| **Autorské práva k fotkám** | právny problém | len fotky od kandidátov a z listín |

Naprieč tabuľkou je jeden vzorec: **pri sklze škrtať počet miest, nie
dôveryhodnosť údajov.** Volebný portál s chybnou adresou volebnej miestnosti
je horší než portál, ktorý tú funkciu nemá.

---

## 6. Otvorené otázky

1. **Doména** — bez nej sa nedá založiť projekt ani nastaviť kanonické adresy
2. **Ktoré mestá do prvého kola** — odporúčanie: Bratislava + Košice + 2–3
   krajské mestá; desať miest do volieb nie je reálnych
3. **Rozsah do volieb** — má portál v nových mestách ísť naživo aj bez
   „Môjho okrsku“?
4. **Redakcia** — kto píše analýzy a schvaľuje obsah pre mestá mimo Bratislavy
5. **Termín župných volieb 2026** — od 2022 sú spojené s komunálnymi, ale
   treba potvrdiť

---

## 7. Odporúčanie

Ísť úzko a hlboko: **Bratislava + Košice + dve krajské mestá**, s plnými
výsledkami 2022, kandidátmi a aktualitami; „Môj okrsok“ len tam, kde sa okrsky
stihnú potvrdiť. Po voľbách rozšíriť bez tlaku.

Alternatíva — desať miest s poloprázdnymi sekciami — poškodí značku, ktorú
Bratislava už má vybudovanú.
