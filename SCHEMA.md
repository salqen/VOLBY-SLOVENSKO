# Schéma a prepojenia

22 tabuliek v `db/schema.ts`, pripravených na zber. Overené typovou kontrolou
proti drizzle-orm.

---

## 1. Mapa

```
                          ┌─────────┐
                          │ regions │  8 krajov
                          └────┬────┘
                               │
                          ┌────▼─────┐
                          │ counties │  79 okresov
                          └────┬─────┘
                               │
      ┌────────────────────────▼──────────────────────┐
      │              municipalities                   │  ~2 930
      │  parent_id ──┐  (mestská časť → mesto)        │
      │  successor_id┘  (zaniknutá → nástupca)        │
      └───┬──────────────┬─────────────┬──────────────┘
          │              │             │
     ┌────▼────┐    ┌────▼────┐   ┌────▼─────┐
     │ wards   │    │precincts│   │ coverage │
     └────┬────┘    └────┬────┘   └──────────┘
          │              │
          │         ┌────▼──────────┐
          │         │ address_ranges│  ~150 000
          │         └───────────────┘
          │
┌─────────┴──────────────────────────────────┐
│                                            │
│   elections ──► races ──► candidacies ──► results
│                  │            │  ▲
│                  │            │  └── people ──► person_aliases
│                  │            │
│                  │            └── candidacy_parties ──► parties ──► party_aliases
│                  │
│                  └──► turnout
└────────────────────────────────────────────┘

   preliminary_candidates ──► municipalities   (dočasná, mimo hlavnej cesty)

   sources ──► raw_documents ──► import_records      (zber)
   audit_log                                          (história zmien)
```

**Hlavná cesta portálu:** obec → súťaže → kandidatúry → osoba + výsledok.
Presne túto cestu pokrývajú definované `relations()`; ostatné väzby sa riešia
bežným joinom.

---

## 2. Tabuľky po skupinách

### Geografia — 6

| Tabuľka | Riadkov | Kľúč |
|---|---:|---|
| `regions` | 8 | `code` = ISO 3166-2 (SK-BL…) |
| `counties` | 79 | `code` z číselníka |
| `municipalities` | ~2 930 | **`code` = kód obce ŠÚ SR** |
| `wards` | ~3 000 | `kind` + `code` |
| `precincts` | ~6 000 | obec + číslo |
| `address_ranges` | ~150 000 | — |

### Voľby — 2

| Tabuľka | Riadkov | Kľúč |
|---|---:|---|
| `elections` | jednotky | druh + dátum |
| `races` | 6 000 – 9 000 **na cyklus** | voľby + funkcia + územie |

### Osoby, strany, výsledky — 8

| Tabuľka | Riadkov na cyklus |
|---|---:|
| `people` | ~50 000 |
| `person_aliases` | podľa potreby |
| `parties` | stovky |
| `party_aliases` | stovky |
| `candidacies` | ~60 000 |
| `candidacy_parties` | ≥ candidacies |
| `results` | = candidacies |
| `turnout` | = races |

### Zber a prevádzka — 6

`sources` · `raw_documents` · `import_records` · `coverage` · `audit_log` ·
`preliminary_candidates`

---

## 3. Šesť rozhodnutí, ktoré tvar schémy určujú

### Kód obce, nie názov

Názvy obcí sa opakujú — „Nová Ves“, „Lehota“, „Hôrka“ existujú viackrát
v rôznych okresoch. Párovanie ide výhradne cez `municipalities.code`; `slug`
je jednoznačný až v dvojici s okresom.

### Osoba oddelená od kandidatúry

`people` × `races` → `candidacies`. Osoba existuje raz naprieč rokmi. Bez toho
nejde história ani spojené voľby, kde ten istý človek kandiduje vo viacerých
súťažiach naraz.

### Súťaž ako riadok

`races` = jedna funkcia na jednom území v jedných voľbách. Pridanie župných
volieb je preto vloženie riadkov, nie migrácia. Územie je práve jedno z troch
odkazov podľa `office`: obec, obvod alebo kraj.

### Strana normalizovaná, ale zdrojový reťazec zachovaný

`candidacies.party` drží text presne ako na listine; `candidacy_parties` drží
spárovanú podobu. Obe naraz, aby sa dalo spätne overiť, čo bolo v zdroji a čo
z toho spravil import.

Koalícia je dôvod, prečo je väzba v samostatnej tabuľke a nie stĺpcom.

### Platnosť obcí v čase

Obce sa zlučujú a premenúvajú. `valid_from` / `valid_to` / `successor_id`
umožňujú viazať staré výsledky na vtedajšie usporiadanie. **Zaniknutá obec sa
nikdy nemaže.** Unikátny index na slugu preto platí len medzi
`valid_to IS NULL`.

### Predbežné údaje mimo hlavnej cesty

`preliminary_candidates` nikdy nezapisuje do `candidacies`. Po zverejnení
úradnej listiny sa označia `superseded_at` a úradné dáta vzniknú od nuly —
inak by sa spätne nedalo povedať, ktorý údaj z akého podkladu pochádza.

---

## 4. Čo drží zber pohromade

**Pôvod pri riadku, nie pri tabuľke.** `source_id`, `source_url`, `verified`
na každom riadku, ktorý tvrdí fakt. Nepotvrdené okrsky sa nezobrazujú.

**Surová vrstva.** `raw_documents` drží každý stiahnutý súbor doslova vrátane
`content_hash`. Rovnaký hash = nič sa nespracúva (idempotencia). Zároveň je to
dôkaz pri neskoršej námietke a možnosť prehnať staré podklady opraveným
parserom.

**Pokrytie.** `coverage` sleduje stav po obciach a druhoch dát
(`register`, `vysledky_2022`, `kandidati`, `okrsky`). Pri jednom meste stačilo
pozrieť sa na stránku; pri 2 890 obciach je toto jediný spôsob, ako vedieť, čo
chýba — a zároveň podklad pre verejnú stránku o pokrytí.

---

## 5. Čo v schéme zámerne nie je

- **výsledky po okrskoch** — objem navyše bez úžitku pre voliča
- **hodnotiaci obsah** (analýzy, fact-check, sľuby, postoje) — patrí do
  redakčného portálu, nie do faktografickej databázy
- **adresy návštevníkov** — zadaná adresa sa pri hľadaní okrsku neukladá
- **prihlasovanie a role** — dorieši sa až s redakčnou nadstavbou
