# Zadanie pre LLM — predbežne ohlásené kandidatúry

**Dočasné zadanie. Platí do zverejnenia úradných kandidátnych listín
(~9. 9. 2026). Potom sa nepoužíva.**

Na rozdiel od zadania v `PROMPT-KANDIDATI.md` sú tu **povolené aj neúradné
zdroje** — vyhlásenia kandidátov, oznámenia strán a médiá. Zbiera sa to, čo je
známe pred listinami, aby portál nebol prázdny.

Všetko, čo takto vznikne, sa po zverejnení listín **zahodí a nahradí úradnými
údajmi.** Nič odtiaľto neprejde do konečnej podoby portálu.

---

## ZADANIE

```
OKRES / MESTO:  ……………………………………
VOĽBY:          spojené voľby, 24. 10. 2026
```

*(vyplní zadávateľ; napr. `okres Levice`, `okres Bratislava II`,
`mesto Bratislava — celomestské súťaže`)*

Delenie práce, okrajové prípady Bratislavy a Košíc a vojenské obvody platia
rovnako ako v `PROMPT-KANDIDATI.md`, časť 2.

---

## 1. Čo sa zbiera

Ľudia, o ktorých je **verejne známe, že sa uchádzajú o funkciu** — hoci ešte
nie sú na úradnej listine.

Uvoľnenie sa týka zdroja, nie istoty. Stále platí, že sa nič nedomýšľa: mení sa
len to, že popri úradnom dokumente je prijateľné aj vyhlásenie kandidáta či
oznámenie strany.

---

## 2. Tri prijateľné triedy podkladu

Ku každému zápisu ulož, do ktorej triedy patrí.

| Trieda | Čo to je | Príklad |
|---|---|---|
| `sam_oznamil` | kandidát vlastným kanálom | vlastná stránka, profil, tlačová konferencia |
| `strana_nominovala` | vyhlásenie strany alebo koalície | tlačová správa strany |
| `medialne_potvrdene` | médium **cituje priamo kandidáta** | rozhovor, reportáž s citátom |

### Štvrtá trieda, ktorá sa nezbiera

**Špekulácia.** Novinárska úvaha o tom, kto by mohol kandidovať; „podľa
informácií z okolia strany“; diskusné príspevky; ankety; stávkové kurzy;
anonymné zdroje.

Ak text neobsahuje vyjadrenie samotného človeka alebo jeho strany, **nezapisuj
ho.** To nie je opatrnosť navyše — napísať o niekom, že kandiduje, keď to
nikdy nepovedal, je zásah do jeho mena a portál za to ručí.

### Úradujúci starosta nie je kandidát

To, že niekto funkciu práve zastáva, nehovorí nič o tom, či bude znovu
kandidovať. Bez vlastného vyhlásenia sa nezapisuje.

---

## 3. Čo zapísať

| Pole | Poznámka |
|---|---|
| `full_name` | s diakritikou, ako to uvádza zdroj |
| `titles` | ak sú uvedené |
| `office` | o ktorú funkciu sa uchádza |
| `party` | strana podľa ohlásenia; **pred listinou sa môže zmeniť** |
| `claim_kind` | jedna z troch tried vyššie |
| `declared_at` | **kedy vyhlásenie odznelo**, nie kedy si ho našiel |
| `source_url` | adresa, ktorú si otvoril |
| `source_label` | názov dokumentu alebo článku |
| `source_publisher` | kto to vydal |
| `quote` | krátky doslovný úryvok, z ktorého kandidatúra vyplýva |

Citát je tu dôležitý: je to doklad, že vyhlásenie naozaj zaznelo. **Najviac
jedna či dve vety** — nie celé odstavce a nikdy nie celý článok.

Čo sa nezbiera: poradové číslo (pred listinou neexistuje), vek, zamestnanie,
volebný obvod, fotografie, životopisy, programy.

---

## 4. Výstup

```
predbezne-<okres-slug>.json
```

```jsonc
{
  "zadanie": "okres Levice",
  "rezim": "predbezne",
  "volby": "2026-10-24",
  "spracovane": "2026-08-12",
  "obce": [
    {
      "code": "<kód obce>",
      "name": "Levice",
      "status": "hotove",
      "ohlaseni": [
        {
          "full_name": "Ján Novák",
          "titles": "Ing.",
          "office": "primator",
          "party": "nezávislý",
          "claim_kind": "sam_oznamil",
          "declared_at": "2026-06-18",
          "source_url": "https://…",
          "source_label": "Oznámenie kandidatúry",
          "source_publisher": "jannovak.sk",
          "quote": "Do jesenných volieb idem ako nezávislý kandidát."
        }
      ]
    },
    {
      "code": "…",
      "name": "Hronské Kľačany",
      "status": "nikto-neohlasil",
      "ohlaseni": []
    }
  ]
}
```

Hodnoty `status`: `hotove`, `nikto-neohlasil`, `nenajdene`.

`nikto-neohlasil` znamená, že si hľadal a nič nenašiel — čo je pri malých
obciach bežné a úplne v poriadku. Neznamená to, že nikto kandidovať nebude.

**Každá obec okresu musí mať riadok**, aj prázdny.

---

## 5. Kontrola pred odovzdaním

- [ ] každý zápis má `source_url`, ktorú si naozaj otvoril
- [ ] každý zápis má citát alebo doslovnú vetu zo zdroja
- [ ] žiadny zápis nestojí na špekulácii ani na „mal by kandidovať“
- [ ] nikto nie je uvedený len preto, že funkciu práve zastáva
- [ ] `declared_at` je dátum vyhlásenia, nie dnešok
- [ ] počet obcí vo výstupe = počet obcí v okrese
- [ ] JSON je platný

---

## 6. Ako s tým portál naloží

Údaje idú do samostatnej tabuľky `preliminary_candidates`, ktorá **nikdy
nezapisuje do `candidacies`**. Na stránke sa zobrazujú oddelene a označené ako
ohlásené, nie potvrdené, vždy s odkazom na zdroj.

Nepoužijú sa nikde, kde portál tvrdí fakt: nevstupujú do počtu kandidátov,
do výsledkov ani do sekcie „Čo volím“.

V deň zverejnenia úradnej listiny pre danú obec sa všetkým riadkom nastaví
`superseded_at`, prestanú sa zobrazovať a nahradí ich úradný zber podľa
`PROMPT-KANDIDATI.md`. Úradné údaje vznikajú **od nuly**, nie doplnením týchto
— preto sú tabuľky oddelené.

Rátaj s tým, že časť týchto zápisov sa nepotvrdí. Niekto kandidatúru stiahne,
niekto pobeží za inú stranu, niekto listinu nestihne odovzdať. To je v poriadku
a je to dôvod, prečo je celý tento režim dočasný.
