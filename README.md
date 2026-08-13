# Volebný portál pre Slovensko

Faktografický prehľad komunálnych a župných volieb pre **všetkých ~2 930 obcí,
miest a mestských častí** Slovenska. Portál drží len údaje, ktoré sa dajú
doložiť oficiálnym zdrojom — kto kandidoval, koľko dostal hlasov, kde sa volí.

Nadväzuje na `bratislavskevolby.sk`, ktorý zostáva samostatným redakčným
portálom pre hlavné mesto.

---

## Rýchly štart

```bash
cd portal
npm install
npm run stiahni    # tabuľky zo štatistického úradu (~7,6 MB, raz)
npm run dev
```

`npm run data` prepočíta dátovú vrstvu bez sťahovania. `npm run build` ju
prepočíta a zostaví produkčnú verziu.

---

## Čo je hotové

| | Pokrytie |
|---|---|
| Územný register (kraje, okresy, obce, mestské časti) | 2 929 |
| Účasť v komunálnych voľbách 2022 | 2 920 obcí |
| Zvolení starostovia a primátori | 2 925 obcí *(106 z doplnkových volieb)* |
| Kandidáti na starostu 2022 | 6 750 |
| Zvolení poslanci 2022 | 20 462 |
| Kandidáti na poslancov 2022 | 41 614 |
| Zloženie zastupiteľstiev po stranách | 2 918 obcí |
| Župné voľby 2022 — predsedovia a poslanci | 8 krajov, 419 poslancov |

Chýbajú kandidáti 2026 *(listiny sa zverejňujú ~45 dní pred voľbami)*
a volebné okrsky.

---

## Štruktúra

```
├── PROJEKT.md                  zámer, fázy, riziká
├── POSTUP.md                   v akom poradí portál stavať
├── SCHEMA.md                   22 tabuliek a ich prepojenia
├── DATABAZA.md                 objemy, kľúče, párovanie osôb
├── ROZHRANIE.md                adresár ciest a obsah stránok
├── OBCE-FORMAT.md              formát registra obcí
├── SCRAPING-OBCE.md            ako register naplniť
├── VYSLEDKY-2022.md            import výsledkov zo ŠÚ SR
├── PROMPT-KANDIDATI*.md        zadania pre paralelný zber cez LLM
├── db/schema.ts                cieľová schéma (Drizzle, zatiaľ nenasadená)
├── municipalities.csv          register obcí — vstup buildu
└── portal/                     Next.js aplikácia
    ├── scripts/zdroje.mjs      register zdrojov — sem sa pridávajú ďalšie voľby
    ├── scripts/stiahni.mjs     surová vrstva + hashe
    ├── scripts/parsery.mjs     parsery tabuliek ŠÚ SR
    └── scripts/build-data.mjs  zostavenie dátovej vrstvy + kontroly
```

---

## Ako pridať ďalšie voľby

Do `portal/scripts/zdroje.mjs` pribudne položka s adresou súboru a názvom
parsera. Ak má tabuľka rovnaké stĺpce ako existujúca, parser sa použije
znovu; inak sa dopíše do `parsery.mjs`.

Stĺpce sa hľadajú **podľa názvu v hlavičke, nie podľa poradia**. Keby úrad
stĺpec pridal alebo presunul, parser to prežije; keby ho premenoval, spadne
hneď a nahlas — čo je lepšie než ticho zlé dáta.

---

## Zásady

**Nič sa nedopočítava.** Ak zdroj neuvádza počet hlasov, zostáva prázdny, aj
keď by sa dal odvodiť z podielu. Dopočítaný údaj vyzerá rovnako ako zmeraný,
ale nesie chybu zaokrúhlenia.

**Kód obce, nie názov.** Názvy obcí sa opakujú — „Nová Ves“, „Lehota“ či
„Hôrka“ existujú viackrát v rôznych okresoch. Párovanie ide výhradne cez kód
zo štatistického číselníka.

**Chýbajúci údaj sa priznáva.** Pri 2 930 obciach nebude nikdy všetko
naplnené; stav pokrytia je verejný na `/o-portali/zdroje`. Nepotvrdený okrsok
sa nezobrazí ani s upozornením — zlá adresa volebnej miestnosti je horšia než
chýbajúca funkcia.

**Surová vrstva je dôkaz, nie záloha.** Každý stiahnutý súbor sa odkladá
doslova aj s hashom, aby sa pri neskoršej námietke dal ukázať presne ten
podklad, z ktorého údaj pochádza — obce a úrady svoje súbory prepisujú.

---

Zdroj dát: **Štatistický úrad SR**, `volby.statistics.sk`.
