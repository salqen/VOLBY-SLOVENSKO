# Zber predbežne ohlásených kandidatúr

```
OKRES / MESTO:  ……………………………………
VOĽBY:          spojené voľby, 24. 10. 2026
```

## Úloha

Pre **každú obec prideleného okresu** nájdi ľudí, o ktorých je verejne známe,
že sa uchádzajú o funkciu, hoci ešte nie sú na úradnej kandidátnej listine.

## Rozsah

Zbieraj tieto funkcie:

| `office` | Kde |
|---|---|
| `starosta` | obec |
| `primator` | mesto |
| `poslanec_oz` | obec a mesto |
| `starosta_mc`, `poslanec_mz_mc` | len mestské časti Bratislavy a Košíc |
| `poslanec_vuc` | volebný obvod = spravidla okres |

Nezbieraj:

- `predseda_vuc` — samostatné zadanie za celý kraj
- primátora a mestské zastupiteľstvo **Bratislavy a Košíc ako celku** —
  samostatné zadanie (mestské časti áno, tie do okresu patria)
- vojenské obvody Záhorie, Lešť, Valaškovce — nemajú samosprávu

## Prijateľné podklady

Zapíš len to, čo patrí do jednej z týchto tried, a triedu ulož:

| `claim_kind` | Podmienka |
|---|---|
| `sam_oznamil` | kandidát vlastným kanálom (stránka, profil, tlačová konferencia) |
| `strana_nominovala` | vyhlásenie strany alebo koalície |
| `medialne_potvrdene` | médium **cituje priamo kandidáta** |

## Nezapisuj

- špekuláciu: novinárske úvahy, „podľa informácií z okolia strany“, ankety,
  diskusie, stávkové kurzy, anonymné zdroje
- kohokoľvek, kto sám ani jeho strana kandidatúru nevyhlásili
- úradujúceho starostu či primátora len preto, že funkciu zastáva
- čokoľvek z pamäte — každý zápis musí stáť na zdroji, ktorý si otvoril

Ak zdroj neobsahuje vyjadrenie samotného človeka alebo jeho strany, zápis
vynechaj.

## Polia

| Pole | Obsah |
|---|---|
| `full_name` | s diakritikou, ako uvádza zdroj |
| `titles` | ak sú uvedené |
| `office` | podľa tabuľky vyššie |
| `party` | strana podľa ohlásenia |
| `claim_kind` | jedna z troch tried |
| `declared_at` | dátum, kedy vyhlásenie odznelo — nie dnešok |
| `source_url` | adresa, ktorú si otvoril |
| `source_label` | názov dokumentu alebo článku |
| `source_publisher` | vydavateľ |
| `quote` | doslovný úryvok, z ktorého kandidatúra vyplýva — **najviac 2 vety** |

Nezbieraj: poradové číslo, vek, zamestnanie, volebný obvod, fotografie,
životopisy, programy.

## Výstup

Súbor `predbezne-<okres-slug>.json`.

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

`status`: `hotove` · `nikto-neohlasil` · `nenajdene`

**Každá obec okresu musí mať vlastný riadok, aj prázdny.**

## Kontrola pred odovzdaním

- [ ] počet obcí vo výstupe = počet obcí v okrese
- [ ] každý zápis má `source_url`, ktorú si otvoril
- [ ] každý zápis má citát zo zdroja
- [ ] žiadny zápis nestojí na špekulácii
- [ ] nikto nie je uvedený len preto, že funkciu zastáva
- [ ] `declared_at` je dátum vyhlásenia
- [ ] JSON je platný

Na záver uveď: koľko obcí `hotove`, koľko `nikto-neohlasil`, koľko `nenajdene`.
