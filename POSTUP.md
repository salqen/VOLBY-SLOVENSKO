# Postup budovania portálu

Ako ísť od prázdnej databázy k funkčnému celoslovenskému portálu. Schéma je
v `SCHEMA.md`, rozhranie v `ROZHRANIE.md`.

---

## Zásada, ktorá určuje poradie

**Ísť za tým, čo je dostupné hromadne, a odkladať to, čo sa musí zbierať po
obciach.**

Rozdiel je rádový:

| | Zdroj | Práca |
|---|---|---|
| register obcí | jeden súbor | hodiny |
| výsledky 2022 vrátane mien a hlasov | šesť súborov, ~8 MB | dni |
| kandidáti 2026 | listina každej obce zvlášť | týždne |
| okrsky a adresy | PDF každej obce zvlášť | mesiace |

Prvé dva riadky dajú **obsah pre všetkých 2 890 obcí**. Posledné dva rastú
lineárne s počtom obcí a nikdy nebudú úplné. Portál preto musí byť použiteľný
už po druhom riadku.

---

## Fáza 1 — Register obcí

*Podklad: `OBCE-FORMAT.md`, `SCRAPING-OBCE.md`*

Kraje, okresy, obce, mestá, mestské časti. Číselník sa **sťahuje, nescrapuje**.

Bez registra sa nedá spárovať nič ďalšie, takže je to jediná fáza, ktorá
nemôže bežať súbežne s inými.

**Hotovo, keď:** ~2 890 obcí, ~141 miest, presne 39 mestských častí, 79
okresov, 8 krajov a prejdené kontroly z `OBCE-FORMAT.md`.

---

## Fáza 2 — Kostra volieb

Z registra sa **vygenerujú súťaže** — pre každú obec starosta/primátor
a poslanci, pre každú mestskú časť starosta MČ a poslanci MZ, pre každý kraj
predseda a poslanci po obvodoch.

Rádovo 6 000 – 9 000 riadkov v `races`, celé odvodené z geografie, bez
ďalšieho zdroja. Vojenské obvody sa preskakujú.

**Hotovo, keď:** každá obec má aspoň dve súťaže a počty sedia s registrom.

---

## Fáza 3 — Výsledky 2022

*Podklad: `VYSLEDKY-2022.md`*

Šesť súborov zo `volby.statistics.sk` — účasť, kandidáti aj hlasy za celé
Slovensko. **Nie je to zber, je to import.**

Toto je zlomový bod celého projektu: po ňom má **každá obec funkčný obsah** —
kto ju vedie, ako dopadli voľby, aká bola účasť. Bez ohľadu na to, kedy budú
známi kandidáti 2026.

Vedľajší efekt: mená z roku 2022 sú prvým naplnením registra osôb a strán, do
ktorého sa noví kandidáti napájajú. Párovanie tak nezačína od nuly.

**Hotovo, keď:** prejdú kontroly súčtov podielov a počtov zvolených.

---

## Fáza 4 — Portál naživo

*Podklad: `ROZHRANIE.md`*

Až teraz sa stavia web — nad databázou, ktorá už má obsah.

Minimálny rozsah na spustenie:

- vyhľadávanie obce s našepkávaním
- profil obce: vedenie od 2022, výsledky, účasť
- stránky kraja a okresu
- metodika, zoznam zdrojov, stav pokrytia
- otvorené dáta na stiahnutie

Spustiť sa dá **bez kandidátov 2026 a bez okrskov**. Portál, ktorý poctivo
ukazuje výsledky 2022 pre celé Slovensko, je použiteľný sám osebe.

**Hotovo, keď:** ľubovoľná z 2 890 obcí má zmysluplnú stránku.

---

## Fáza 5 — Predbežné kandidatúry *(dočasné)*

*Podklad: `PROMPT-KANDIDATI-PREDBEZNE-AI.md`*

Ohlásené kandidatúry z neúradných zdrojov, kým nie sú listiny. Oddelená
tabuľka, zreteľne označené, nikde sa nezapočítavajú do faktov.

Fáza je voliteľná a celá sa zahodí vo fáze 6.

---

## Fáza 6 — Kandidáti 2026

*Podklad: `PROMPT-KANDIDATI.md`*

Po zverejnení úradných listín (~45 dní pred voľbami). Paralelní pracovníci,
jeden okres na jedného.

**Najprv over**, či štatistický úrad nezverejní zoznamy centrálne ako v roku
2022 — vtedy odpadne väčšina tejto fázy. Nespúšťať desiatky účtov, kým to nie
je overené.

Predbežné záznamy sa označia `superseded_at`.

---

## Fáza 7 — Okrsky

Extrakcia z PDF do návrhu + **povinné ručné potvrdenie** oproti originálu.

Jediná fáza, ktorá rastie lineárne s počtom obcí, a jediná, ktorá nikdy nebude
úplná. Preto:

- ide sa **podľa počtu obyvateľov** — prvých ~200 obcí pokryje väčšinu voličov
- „Kde volím“ sa zapína **po obciach**, nie naraz
- nepotvrdený okrsok sa nezobrazí ani s upozornením

Zlá adresa volebnej miestnosti je horšia než chýbajúca funkcia.

---

## Fáza 8 — Župné voľby

Vloženie súťaží `predseda_vuc` a `poslanec_vuc` a ich kandidátov. Schéma sa
nemení — je to dátová operácia, preto je fáza krátka.

Môže bežať súbežne s fázou 6; predsedovia krajov sú samostatné zadanie za
kraj, poslanci VÚC patria do okresných zadaní.

---

## Čo môže bežať súbežne

```
1 register ──► 2 kostra ──► 3 výsledky 2022 ──► 4 portál naživo
                                                   │
                                                   ├──► 5 predbežné ──► 6 kandidáti
                                                   ├──► 7 okrsky (priebežne, po obciach)
                                                   └──► 8 župné
```

Fázy 1 – 4 idú za sebou. Od piatej sa vetví.

---

## Kde to môže spadnúť

| Riziko | Ako sa prejaví | Čo s tým |
|---|---|---|
| register nesedí s číselníkom | nespárujú sa výsledky | kontroly vo fáze 1, neísť ďalej |
| kód obce prevedený na číslo | zmiznú vedúce nuly | pravidlo v `SCRAPING-OBCE.md` |
| párovanie osôb zlúči dvoch ľudí | cudzia história v profile | ručné potvrdenie pod prahom istoty |
| okrsky sa nestihnú | chýba najžiadanejšia funkcia | zapínať po obciach, nie odkladať spustenie |
| paralelní pracovníci si prekryjú prácu | duplicity | jeden okres = jeden pracovník, BA a KE zvlášť |
| LLM vymyslí kandidátov | nepravda na portáli | povinný zdroj a citát pri každom zápise |

---

## Kedy je portál hotový

Nikdy úplne — pokrytie okrskov porastie postupne a to je v poriadku.
Zmysluplné míľniky:

1. **každá obec má stránku** *(po fáze 4)* — portál sa dá zverejniť
2. **každá obec má kandidátov 2026** *(fáza 6)* — portál je užitočný pred voľbami
3. **väčšina voličov si nájde svoj okrsok** *(fáza 7, priebežne)*

Stav pokrytia patrí na verejnú stránku. Portál, ktorý priznáva, čo nemá, je
dôveryhodnejší než portál, ktorý to skrýva.
