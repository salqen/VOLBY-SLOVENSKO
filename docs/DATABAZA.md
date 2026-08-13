# Databáza — implementácia dát

Rozsah: **všetky obce Slovenska**, komunálne aj župné voľby, s históriou.
Schéma je v `db/schema.ts` ako priamo použiteľný Drizzle kód (overený typovou
kontrolou).

---

## 1. Čo portál drží a čo nie

Portál je **faktografická databáza**, nie redakčný web. Drží len údaje, ktoré
sa dajú doložiť oficiálnym zdrojom:

| Drží | Nedrží |
|---|---|
| kto kandidoval, za koho, s akým číslom | analýzy a komentáre |
| koľko dostal hlasov, či bol zvolený | fact-checky |
| účasť a počty voličov | sledovanie sľubov |
| kde sa volí (okrsky, adresy) | porovnávač postojov |
| územná štruktúra a jej história | hodnotenie kandidátov |

Hodnotiaci obsah zostáva v redakčnom portáli pre jednotlivé mestá
(dnešný `BAvolby-git`). Národná databáza sa mu stane zdrojom dát.

Dôvod nie je technický. Pri 2 890 obciach nie je redakčne možné písať analýzy
ku všetkým, a portál, ktorý má obsah k pätnástim obciam a prázdno k zvyšku,
pôsobí horšie než portál, ktorý sľubuje fakty a tie dodá všade.

---

## 2. Objem

Odhady rádovo; presné čísla treba overiť proti registrom.

| Tabuľka | Riadkov | Poznámka |
|---|---:|---|
| `regions` | 8 | samosprávne kraje |
| `counties` | 79 | okresy |
| `municipalities` | ~2 930 | ~2 890 obcí + 39 mestských častí |
| `wards` | ~3 000 | volebné obvody obcí aj krajov |
| `precincts` | ~6 000 | |
| `address_ranges` | **~150 000+** | najobjemnejšia tabuľka |
| `races` | ~6 000 – 9 000 | **na jeden volebný cyklus** |
| `people` | ~50 000 | na cyklus, naprieč rokmi menej vďaka párovaniu |
| `candidacies` | ~50 000 – 60 000 | na cyklus |
| `results` | = candidacies | |
| `raw_documents` | ~10 000 / cyklus | jeden na každý stiahnutý súbor |

**Na tieto objemy stačí jedna bežná Postgres inštancia.** Delenie tabuliek ani
špeciálna infraštruktúra netreba — ani po niekoľkých volebných cykloch. Úzkym
miestom projektu nie je databáza, ale získavanie a párovanie dát.

---

## 3. Tri rozhodnutia, na ktorých schéma stojí

### Kód obce, nie názov

Názvy obcí sa v zdrojoch píšu rôzne a **opakujú sa** — „Nová Ves“, „Lehota“
či „Hôrka“ existujú na Slovensku viackrát. Slug preto obec neidentifikuje
a je unikátny až v rámci okresu (`municipalities_county_slug_idx`).

Jediný spoľahlivý kľúč je kód obce zo štatistického číselníka. Bez neho sa
importy z rôznych zdrojov nikdy nespoja.

### Osoba a kandidatúra oddelene

`people` × `races` → `candidacies`. Osoba existuje raz naprieč všetkými
voľbami a rokmi.

Bez tohto rozdelenia nejde ukázať, že ten istý človek kandidoval v roku 2018
na starostu a v roku 2026 na predsedu kraja — a pri spojených voľbách, kde
kandiduje vo viacerých súťažiach naraz, by vznikli nespojené duplikáty.

### Súťaž ako riadok

`races` = jedna volená funkcia na jednom území v jedných voľbách. Vďaka tomu
je **pridanie župných volieb dátová operácia, nie migrácia schémy**.

Územie je práve jedno z troch podľa `office`:

| Funkcia | Územie |
|---|---|
| starosta, primátor, poslanec OZ | obec (+ obvod pri poslancoch) |
| starosta MČ, poslanec MZ MČ | mestská časť |
| predseda VÚC | kraj |
| poslanec VÚC | volebný obvod kraja (spravidla = okres) |

---

## 4. Vrstvy zberu

```
zdroj → raw_documents → import_records → jadro
        doslova           rozparsované,    normalizované,
                          nespárované      s pôvodom
```

**Surová vrstva nie je záloha, je dôkaz.** Keď niekto namietne údaj, treba
vedieť ukázať presne ten súbor, z ktorého pochádza, v podobe, v akej vtedy
bol — obce svoje PDF prepisujú a mažú. Vedľajší efekt: parser sa dá opraviť
a staré podklady prehnať znova bez opätovného sťahovania.

Idempotencia stojí na `content_hash` (SHA-256). Rovnaký hash → koniec, nič sa
nespracúva. Scraper môže bežať hodinovo a väčšinu času nerobiť nič.

Prirodzené kľúče, aby opakovaný import robil UPSERT:

| Entita | Kľúč |
|---|---|
| obec | kód obce |
| voľby | druh + dátum konania |
| súťaž | voľby + funkcia + územie |
| okrsok | obec + číslo okrsku |
| kandidatúra | súťaž + číslo na lístku |

---

## 5. Párovanie osôb

Najkrehkejšia časť celého systému. Pri 50 000 kandidátoch na cyklus je ručné
riešenie vylúčené a automatické riskantné.

1. **normalizuj** — odstráň diakritiku a tituly (Ing., Mgr., JUDr., PhD.),
   zjednoť medzery a spojovníky, zoraď zložky mena → `name_normalized`
2. **hľadaj** v `people.name_normalized` a `person_aliases`
3. **rozhoduj** podľa (normalizované meno + rok narodenia + obec kandidatúry)

`import_records.confidence` drží istotu. **Pod prahom sa nespája automaticky** —
záznam ide do frontu na ručné rozhodnutie.

Zlé zlúčenie dvoch ľudí s rovnakým menom je horšia chyba než duplicitný profil:
duplikát je viditeľný a opraviteľný, zlúčenie pripíše človeku cudziu
kandidatúru a nikto si toho nemusí všimnúť.

---

## 6. Pôvod a zmeny

Každý riadok tvrdiaci fakt nesie `source_id`, `source_url` a `verified`.
Nepotvrdené okrsky sa nezobrazujú — radšej chýbajúca funkcia než zlá adresa
volebnej miestnosti.

`audit_log` drží históriu zmien zverejnených údajov po jednotlivých poliach.
Import nikdy nemení zverejnený údaj potichu; bez schválenia prejde len prvé
naplnenie prázdnej tabuľky a údaje, ktoré zdroj označuje za definitívne
(výsledky ŠÚ SR).

---

## 7. Poradie napĺňania

Poradie je dané závislosťami, nie dôležitosťou.

1. **Kraje, okresy, obce** zo štatistického číselníka — bez nich sa nedá
   spárovať nič ďalšie
2. **Volebné udalosti a súťaže** — generujú sa z geografie a druhu volieb
3. **Výsledky a účasť** zo `volby.statistics.sk` — jeden súbor pokrýva celé
   Slovensko naraz; po tomto kroku má **každá obec funkčný obsah**
4. **Osoby** spätne z výsledkov starších volieb — vzniká register osôb, do
   ktorého sa noví kandidáti párujú
5. **Kandidátne listiny** aktuálnych volieb
6. **Okrsky a adresy** po obciach, poloautomaticky s ručným potvrdením

Krok 3 je najlacnejší obsah v projekte: jedno stiahnutie a portál má výsledky
pre všetkých 2 890 obcí. Krok 6 je najdrahší a jediný, ktorý rastie lineárne
s počtom obcí.

---

## 8. Zdroje

| Údaj | Zdroj | Formát | Náročnosť |
|---|---|---|---|
| číselníky obcí, okresov, krajov | ŠÚ SR, data.gov.sk | CSV, API | nízka |
| výsledky, účasť, počty voličov | `volby.statistics.sk` | XLSX, CSV | nízka |
| štatistika obcí | DataCube (ŠÚ SR) | API | nízka |
| kandidátne listiny | weby obcí a krajov | **PDF** | vysoká |
| okrsky a rozsahy ulíc | weby obcí | **PDF, skeny** | najvyššia |

Pri 2 890 obciach je posledný riadok samostatný podprojekt. Každá obec
zverejňuje okrsky po svojom, mnohé ako sken. Realistický cieľ nie je pokrytie
všetkých obcí, ale **postupné pokrytie podľa počtu obyvateľov** — prvých 200
obcí pokryje väčšinu voličov.

### Právne mantinely

Údaje o kandidátoch sú verejné a spracúvať sa dajú. **Fotografie sú spravidla
chránené autorským právom** — nepreberať zo spravodajských webov; len fotky
z kandidátnych listín alebo od kandidátov, s `photo_credit`.

Adresa, ktorú zadá návštevník do vyhľadania okrsku, sa neukladá.
