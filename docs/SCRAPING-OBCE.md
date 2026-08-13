# Naplnenie registra obcí — postup zberu

Ako dostať do tabuliek `regions`, `counties` a `municipalities` všetkých ~2 890
obcí, ~141 miest a 39 mestských častí. Formát cieľa je v `OBCE-FORMAT.md`.

**Toto je krok číslo jeden celého projektu.** Kým register nestojí, nedá sa
spárovať ani jeden výsledok, kandidát ani okrsok.

---

## 1. Zásada: číselník sa nescrapuje, sťahuje

Register obcí je verejný otvorený dataset. Neťahá sa po riadkoch z webových
stránok obcí ani z encyklopédií — **stiahne sa ako celok z úradného zdroja.**

Scrapovanie sa použije len na doplnkové údaje (webové sídlo, súradnice), ktoré
v číselníku nie sú. Ak sa niekedy zdá, že treba scrapovať názvy alebo kódy
obcí, je to znak, že sa použil nesprávny zdroj.

---

## 2. Zdroje

| Údaj | Zdroj | Formát | Poznámka |
|---|---|---|---|
| kódy a názvy obcí, zaradenie do okresov | **ŠÚ SR — číselník obcí**, dostupný aj cez `data.gov.sk` | CSV, XML | základ, jediný záväzný |
| okresy a kraje | ten istý číselník | CSV | |
| štatút mesta | číselník / zákon o obecnom zriadení | CSV | určuje `type` |
| IČO obce | Register právnických osôb (ŠÚ SR) | API, CSV | párovať cez názov + okres, potom overiť |
| počet obyvateľov | **DataCube** (ŠÚ SR) | API | uviesť dátum platnosti |
| rozloha | DataCube | API | |
| súradnice | OpenStreetMap / geoportál | API | doplnkové |
| webové sídlo obce | ZMOS, weby obcí | HTML | doplnkové, treba overovať |

Poradie sťahovania kopíruje závislosti: **kraje → okresy → obce → mestské
časti → doplnkové údaje.**

---

## 3. Postup

### Krok 1 — Kraje a okresy (ručne, raz)

Osem krajov a 79 okresov sa nemení. Zapíšu sa raz, aj ručne, a skontrolujú
proti číselníku. Kraje dostanú kódy ISO 3166-2:SK (`SK-BL`, `SK-TA`, `SK-TC`,
`SK-NI`, `SK-ZI`, `SK-BC`, `SK-PV`, `SK-KI`).

### Krok 2 — Obce z číselníka

Stiahnuť celý číselník ako jeden súbor, uložiť do `raw_documents` **doslova**,
až potom parsovať.

Mapovanie na cieľové stĺpce:

```
kód obce      → code            (6 číslic, ponechať vedúce nuly ako text!)
názov         → name            (presne, s diakritikou)
              → name_normalized (odvodiť: bez diakritiky, malé písmená)
              → slug            (odvodiť z názvu)
okres         → county_id       (cez kód okresu, nie názov)
štatút mesta  → type            ('mesto' / 'obec')
```

**Kód obce spracovať ako text, nikdy ako číslo.** Prevod na integer zožerie
vedúcu nulu a kód prestane sedieť so zdrojom — klasická a ťažko odhaliteľná
chyba pri práci s tabuľkovými zdrojmi.

### Krok 3 — Mestské časti

Mestské časti Bratislavy a Košíc majú v číselníku vlastné kódy obcí, takže
prídu spolu s obcami. Doplniť treba dve veci:

- `type = mestska_cast`
- `parent_id` na mesto (Bratislava, resp. Košice)

Väzbu na rodiča **nastaviť ručne** — je to 39 riadkov a odvodzovanie z názvu
(„Bratislava-…") je krehké. Ručný zoznam je tu spoľahlivejší než pravidlo.

Pozor: mestská časť leží v inom okrese než mesto ako celok (Staré Mesto je
v okrese Bratislava I, mesto Bratislava nie je v žiadnom z piatich). Kontrola
zhody okresu medzi MČ a rodičom by preto padala — kontroluje sa **kraj**.

### Krok 4 — Vojenské obvody

Tri záznamy (Záhorie, Lešť, Valaškovce) s `type = vojensky_obvod`.

Musia byť v registri, aby územie sedelo, ale **nesmú im vzniknúť volebné
súťaže** — nemajú samosprávu. Generátor súťaží ich preskakuje.

### Krok 5 — Doplnkové údaje

Populácia a rozloha z DataCube, súradnice z OSM, weby obcí. Všetko nepovinné —
register je použiteľný aj bez nich a chýbajúca hodnota zostáva prázdna.

Webové sídla obcí sa oplatí doplniť skoro: **sú vstupom pre zber okrskov**,
ktorý je najdrahšou časťou projektu.

---

## 4. Odvodené hodnoty

### Normalizácia názvu

```
Bratislava-Nové Mesto  →  bratislava nove mesto
Šaľa                   →  sala
Veľký Krtíš            →  velky krtis
```

Odstrániť diakritiku, previesť na malé písmená, spojovníky a viacnásobné
medzery nahradiť jednou medzerou. Slúži na vyhľadávanie a párovanie.

### Slug

Z názvu, malé písmená, diakritika odstránená, medzery a spojovníky na `-`.
Pri mestských častiach **bez prefixu mesta** — `nove-mesto`, nie
`bratislava-nove-mesto`; mesto je už v ceste.

Slug musí byť unikátny **medzi platnými obcami v rámci okresu**. Pri kolízii
(dve rovnomenné obce v jednom okrese, čo je zriedkavé) pripojiť kód obce.

---

## 5. Opakovaný import

Číselník sa mení párkrát do roka — obce sa zlučujú, menia názov, získavajú
štatút mesta.

Import je **idempotentný**: kľúčom je `code`, takže opakovaný beh robí UPSERT.
Rovnaký `content_hash` stiahnutého súboru znamená, že sa nespracúva nič.

Zmeny, ktoré treba ošetriť zvlášť:

| Zmena | Postup |
|---|---|
| nový názov | prepísať `name`, **slug ponechať** a pridať presmerovanie |
| obec získala štatút mesta | zmeniť `type`, nič ďalšie |
| obec zanikla zlúčením | nastaviť `valid_to` + `successor_id`, **nemazať** |
| obec vznikla rozdelením | nový riadok s `valid_from` |
| zmena okresu | prepísať `county_id`, staré URL presmerovať |

**Zaniknutá obec sa nikdy nemaže.** Viažu sa na ňu výsledky starých volieb;
zmazaním by sa stratili alebo priradili nesprávne.

---

## 6. Kontrola pred zápisom

Import beží najprv nasucho a vypíše rozdiel. Zápis až po prejdení kontrol
z `OBCE-FORMAT.md`, časť 6. Najdôležitejšie:

- ~2 890 obcí, ~141 miest, **presne 39** mestských častí, 79 okresov, 8 krajov
- kód obce: 6 číslic, unikátny, **s vedúcimi nulami**
- každá obec má okres; každá MČ má rodiča typu `mesto`
- súčet obyvateľov mestských častí ≈ mesto (do 5 %)
- súradnice v obdĺžniku 47,7–49,7 °N a 16,8–22,6 °E

Kontrola počtu mestských častí je zámerne presná: 39 je pevné číslo a odchýlka
znamená, že sa buď nesprávne určil `type`, alebo sa MČ zamenili s obcami.

---

## 7. Čo z registra vzniká ďalej

Hneď po naplnení sa dá **vygenerovať kostra volebných súťaží** — pre každú
obec starosta/primátor a poslanci OZ, pre každú MČ starosta MČ a poslanci
MZ MČ, pre každý kraj predseda VÚC a poslanci VÚC po obvodoch. Rádovo
6 000 – 9 000 riadkov v `races`, celé z geografie, bez ďalšieho zdroja.

Potom sa dajú naliať výsledky zo ŠÚ SR — jeden súbor za celé Slovensko —
a portál má obsah pre **všetkých 2 890 obcí naraz**, ešte pred tým, než je
známy jediný kandidát.

To je dôvod, prečo je register prvý krok a nie prípravná práca.
