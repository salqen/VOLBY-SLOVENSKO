# Register obcí, miest a mestských častí — formát

Presný tvar tabuliek `regions`, `counties` a `municipalities`. Kód je
v `db/schema.ts`, napĺňanie v `SCRAPING-OBCE.md`.

Toto je základ celej databázy — bez neho sa nedá spárovať ani jeden výsledok,
kandidát či okrsok.

---

## 1. Čo register obsahuje

| Úroveň | Tabuľka | Počet | Volí sa tu |
|---|---|---:|---|
| samosprávny kraj | `regions` | 8 | predseda VÚC, poslanci VÚC |
| okres | `counties` | 79 | — *(len územné členenie)* |
| obec / mesto | `municipalities` | ~2 890 | starosta / primátor, poslanci OZ |
| mestská časť | `municipalities` | 39 | starosta MČ, poslanci MZ MČ |
| vojenský obvod | `municipalities` | 3 | **nič — nemá samosprávu** |

Mestské časti sú v tej istej tabuľke ako obce, odlíšené `type` a `parentId`.
Majú vlastný kód obce v štatistickom číselníku, takže sa správajú ako
plnohodnotné jednotky — čo zodpovedá realite, lebo si volia vlastného starostu.

Bratislava má 17 mestských častí rozložených do 5 okresov (Bratislava I–V),
Košice 22 do 4 okresov (Košice I–IV). Mesto ako celok je **tiež** samostatný
záznam — volí sa v ňom primátor.

Vojenské obvody (Záhorie, Lešť, Valaškovce) do registra patria kvôli úplnosti
územia, ale nesmú im vzniknúť žiadne volebné súťaže.

---

## 2. `regions` — kraje

| Stĺpec | Typ | Povinné | Príklad | Pravidlo |
|---|---|---|---|---|
| `code` | varchar(8) | áno | `SK-BL` | ISO 3166-2:SK |
| `name` | varchar(96) | áno | `Bratislavský kraj` | úradný názov |
| `slug` | varchar(96) | áno | `bratislavsky` | unikátny |
| `seat` | varchar(96) | nie | `Bratislava` | sídlo kraja |

Osem krajov: Bratislavský, Trnavský, Trenčiansky, Nitriansky, Žilinský,
Banskobystrický, Prešovský, Košický.

---

## 3. `counties` — okresy

| Stĺpec | Typ | Povinné | Príklad | Pravidlo |
|---|---|---|---|---|
| `code` | varchar(8) | áno | *(z číselníka)* | kód okresu ŠÚ SR |
| `name` | varchar(96) | áno | `Bratislava I` | úradný názov |
| `slug` | varchar(96) | áno | `bratislava-i` | unikátny v kraji |
| `regionId` | FK | áno | → `regions` | |

Okres nie je volebná jednotka. V databáze je preto, že **volebné obvody pre
poslancov VÚC sa spravidla kryjú s okresmi** a že bez neho nie je slug obce
jednoznačný.

---

## 4. `municipalities` — obce, mestá, mestské časti

Ťažisko registra.

| Stĺpec | Typ | Povinné | Príklad | Pravidlo |
|---|---|---|---|---|
| `code` | varchar(12) | **áno** | 6-miestne číslo | **kód obce ŠÚ SR — prirodzený kľúč, unikátny** |
| `name` | varchar(128) | áno | `Bratislava-Nové Mesto` | úradný názov s diakritikou |
| `nameNormalized` | varchar(128) | áno | `bratislava nove mesto` | bez diakritiky, malé písmená |
| `slug` | varchar(128) | áno | `nove-mesto` | unikátny v okrese **medzi platnými** |
| `type` | enum | áno | `mestska_cast` | `mesto` \| `obec` \| `mestska_cast` \| `vojensky_obvod` |
| `countyId` | FK | áno | → `counties` | okres, v ktorom leží |
| `parentId` | FK | pri MČ | → `municipalities` | mesto, ku ktorému MČ patrí |
| `ico` | varchar(8) | nie | 8 číslic | IČO obce |
| `population` | integer | nie | `39 654` | k dátumu, viď nižšie |
| `areaKm2` | real | nie | `37.42` | |
| `lat`, `lng` | real | nie | `48.1858`, `17.1275` | ťažisko obce |
| `website` | varchar(512) | nie | | odtiaľ sa ťahajú okrsky |
| `validFrom` | date | nie | `1996-01-01` | odkedy jednotka existuje |
| `validTo` | date | nie | `null` | `null` = platná dnes |
| `successorId` | FK | pri zániku | → `municipalities` | nástupca po zlúčení |

### Kód obce je jediný spoľahlivý kľúč

Názvy obcí sa v zdrojoch píšu rôzne — `Bratislava - Nové Mesto`,
`Bratislava-Nové Mesto`, `Nové Mesto`. **A navyše sa opakujú:** „Nová Ves",
„Lehota", „Hôrka", „Dubová" a desiatky ďalších existujú na Slovensku viackrát,
v rôznych okresoch.

Preto:

- párovanie prebieha **výhradne cez `code`**, nikdy cez názov
- `slug` je unikátny až v dvojici s okresom
- URL obce obsahuje okres: `/obec/levice/nova-ves`

### Platnosť v čase

Obce sa zlučujú, delia a premenúvajú. Výsledky volieb 2018 sa viažu na
vtedajšie usporiadanie — bez `validFrom` / `validTo` by sa historický výsledok
priradil k jednotke, ktorá vtedy neexistovala, alebo by sa stratil.

Zaniknutá obec sa **nemaže**. Dostane `validTo` a `successorId`, aby staré
odkazy vedeli presmerovať. Unikátny index na slugu preto platí len medzi
záznamami s `validTo IS NULL`.

### Počet obyvateľov

Nie je to vlastnosť obce, ale údaj k dátumu. V registri je preto len posledná
známa hodnota na zobrazenie. Ak bude treba rady v čase, patria do samostatnej
tabuľky — nie do ďalších stĺpcov `population_2021`, `population_2022`.

**Počet obyvateľov nie je počet voličov.** Na výpočet účasti sa použije
`turnout.voters` zo ŠÚ SR, nikdy tento stĺpec.

---

## 5. Výmenný formát

Register sa dodáva ako CSV s hlavičkou, UTF-8, oddeľovač `,`, desatinná bodka.
Jeden súbor na úroveň.

**`obce.csv`**

```csv
code,name,slug,type,county_code,parent_code,ico,population,area_km2,lat,lng,website,valid_from,valid_to,successor_code
529346,Bratislava-Staré Mesto,stare-mesto,mestska_cast,<okres>,<mesto>,00603147,40126,9.6,48.1486,17.1077,https://www.staremesto.sk,,,
```

Pravidlá:

- prázdna bunka = údaj nie je známy; **nie** `0`, `-` ani `N/A`
- odkazy medzi riadkami idú cez `code`, nie cez interné `id`
- `name` presne ako v úradnom číselníku, vrátane diakritiky a spojovníkov
- `name_normalized` a `slug` generuje import, do CSV nepatria

JSON variant má tie isté polia; použije sa tam, kde treba doplniť pôvod
(`sources[]`) po jednotlivých riadkoch.

---

## 6. Kontroly, ktoré musí register prejsť

Bez nich sa neimportuje.

| Kontrola | Očakávanie |
|---|---|
| počet obcí | ~2 890 (±10 podľa aktuálnosti číselníka) |
| počet miest | ~141 s `type = mesto` |
| počet mestských častí | presne 39 (17 BA + 22 KE) |
| počet okresov | presne 79 |
| počet krajov | presne 8 |
| kód obce | 6 číslic, unikátny, bez medzier |
| každá obec má okres | 0 riadkov bez `county_code` |
| každá MČ má rodiča | `type = mestska_cast` ⇒ `parent_code` vyplnený |
| rodič je mesto | `parent_code` ukazuje na `type = mesto` |
| MČ a rodič v tom istom kraji | áno *(nie nutne v tom istom okrese)* |
| súčet MČ ≈ mesto | populácia MČ vs. mesta do 5 % |
| duplicitné slugy | len v rôznych okresoch |
| súradnice | `lat` 47.7–49.7, `lng` 16.8–22.6 |
| vojenské obvody | 3 riadky, žiadne volebné súťaže |

Poznámka k predposlednému riadku: hranice Slovenska sú približne
47,73–49,61 severnej šírky a 16,83–22,57 východnej dĺžky. Súradnica mimo
tohto obdĺžnika je vždy chyba prevodu, nie výnimka.
