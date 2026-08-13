# Zadanie pre LLM — zber kandidátov

Tento súbor sa vkladá do **novej relácie** ako celé zadanie. Doplní sa jediný
riadok — ktorý okres alebo mesto sa spracúva — a nič iné netreba.

Viacero účtov môže pracovať súčasne, každý na svojom okrese. Nekoordinujú sa
medzi sebou a o výstupoch ostatných nevedia.

---

## ZADANIE

```
OKRES / MESTO:  ……………………………………
VOĽBY:          spojené voľby, 24. 10. 2026
```

*(vyplní zadávateľ; napr. `okres Levice`, `okres Bratislava II`,
`mesto Bratislava — celomestské súťaže`)*

---

## 1. Pravidlo, ktoré je nad všetkými ostatnými

**Nikdy nevypisuj kandidáta, ktorého si nenašiel v konkrétnom dokumente.**

Mená slovenských politikov vieš skladať tak, že vyzerajú vierohodne. Zoznam
vymyslených kandidátov je pre tento projekt horší než prázdny zoznam — prázdny
zoznam sa dá doplniť, vymyslený sa zverejní a nikto si to nemusí všimnúť.

Preto platí:

- ku každému kandidátovi musíš mať **adresu dokumentu, ktorý si otvoril**
- ak sa dokument nedá nájsť alebo otvoriť → `status: "nenajdene"` a prázdny
  zoznam
- ak kandidátne listiny ešte neboli zverejnené → `status: "nezverejnene"`
- ak si našiel len časť (napr. starostu, ale nie poslancov) →
  `status: "ciastocne"` a vypíš, čo chýba
- **nikdy nedopĺňaj údaj z pamäte ani z iných volieb**

Neúplný výstup je správny výsledok. Vymyslený nie je nikdy.

---

## 2. Čo sa v pridelenom území volí

Pri spojených voľbách sa v jeden deň volí viac funkcií. Pre každú obec
v okrese zisti:

| Funkcia | Kde |
|---|---|
| starosta | každá obec |
| primátor | každé mesto |
| poslanci obecného / mestského zastupiteľstva | každá obec a mesto |
| starosta mestskej časti | len mestské časti BA a KE |
| poslanci miestneho zastupiteľstva MČ | len mestské časti BA a KE |
| poslanci zastupiteľstva samosprávneho kraja | volebný obvod = spravidla okres |

**Predsedu kraja nezbieraj** — ten je samostatné zadanie pre celý kraj, inak by
ho zapísalo osem pracovníkov naraz.

### Bratislava a Košice

Mestské časti patria do okresov (Staré Mesto do okresu Bratislava I atď.),
takže ich spracuje pracovník príslušného okresu.

**Primátora a poslancov mestského zastupiteľstva Bratislavy nezbieraj v rámci
okresu** — mesto ako celok nepatrí do žiadneho z piatich okresov a má vlastné
zadanie (`mesto Bratislava — celomestské súťaže`). To isté platí pre Košice.

### Vojenské obvody

Záhorie, Lešť a Valaškovce nemajú samosprávu a nič sa v nich nevolí. Ak na ne
narazíš, preskoč ich.

---

## 3. Kde hľadať, v tomto poradí

1. **Úradná tabuľa obce na jej webovom sídle** — zoznam zaregistrovaných
   kandidátov; spravidla PDF
2. **Web mesta / mestskej časti** — sekcia „Voľby 2026“
3. **Web samosprávneho kraja** — pre poslancov VÚC
4. Ústredná stránka volieb ministerstva vnútra

Ak obec zverejnila zoznam ako skenované PDF a text sa nedá spoľahlivo prečítať,
**neháda sa** — `status: "necitatelne"` a odkaz na dokument. Prepíše to človek.

Neber údaje zo spravodajských článkov, z encyklopédií ani z profilov na
sociálnych sieťach. Len úradné zdroje.

---

## 4. Čo o kandidátovi zapísať

Kandidátna listina uvádza pri každom kandidátovi ustálenú sadu údajov. Zapíš
ich **presne tak, ako sú vytlačené**:

| Pole | Z listiny | Poznámka |
|---|---|---|
| `ballot_number` | poradové číslo | číslo na hlasovacom lístku |
| `full_name` | meno a priezvisko | **s diakritikou, presne** |
| `titles` | tituly | `Ing.`, `Mgr.`, `PhD.` — samostatne, nie v mene |
| `age` | vek | číslo tak, ako je uvedené |
| `occupation` | zamestnanie | doslova, neprekladaj ani neskracuj |
| `party` | politická strana | doslova; nezávislý → `nezávislý kandidát` |
| `coalition` | strany koalície | zoznam, ak ide o koalíciu |

Čo **nerobiť**:

- neprepočítavaj vek na rok narodenia — vek k dátumu volieb je iná vec
  a nesprávny rok pokazí neskoršie párovanie osôb
- neopravuj mená ani zamestnania, ani keď vyzerajú ako preklep
- nedopĺňaj fotografie, kontakty ani životopisy
- nepridávaj hodnotenia, poradie ani odhady šancí

---

## 5. Výstup

Jeden súbor JSON na okres. Názov:

```
kandidati-<okres-slug>.json
```

Napríklad `kandidati-levice.json`, `kandidati-bratislava-ii.json`.

```jsonc
{
  "zadanie": "okres Levice",
  "volby": "2026-10-24",
  "spracovane": "2026-08-12",
  "obce": [
    {
      "code": "<kód obce zo zadania alebo z registra>",
      "name": "Levice",
      "status": "hotove",
      "zdroje": [
        {
          "label": "Zoznam zaregistrovaných kandidátov — primátor",
          "href": "https://…",
          "otvorene": true
        }
      ],
      "sutaze": [
        {
          "office": "primator",
          "kandidati": [
            {
              "ballot_number": 1,
              "full_name": "Ján Novák",
              "titles": "Ing.",
              "age": 51,
              "occupation": "projektový manažér",
              "party": "nezávislý kandidát",
              "coalition": []
            }
          ]
        },
        {
          "office": "poslanec_oz",
          "ward": "volebný obvod č. 1",
          "seats": 7,
          "kandidati": []
        }
      ]
    },
    {
      "code": "…",
      "name": "Hronské Kľačany",
      "status": "nezverejnene",
      "zdroje": [{ "label": "Úradná tabuľa obce", "href": "https://…", "otvorene": true }],
      "sutaze": [],
      "poznamka": "K 12. 8. 2026 zoznam kandidátov nezverejnený."
    }
  ]
}
```

Povolené hodnoty `status`: `hotove`, `ciastocne`, `nezverejnene`,
`nenajdene`, `necitatelne`.

Hodnoty `office`: `starosta`, `primator`, `starosta_mc`, `poslanec_oz`,
`poslanec_mz_mc`, `poslanec_vuc`.

**Každá obec okresu musí mať svoj riadok**, aj keď je `status` iný než
`hotove`. Chýbajúca obec vo výstupe znamená, že sa na ňu zabudlo — a to sa
z výstupu nedá odlíšiť od obce bez kandidátov.

---

## 6. Kontrola pred odovzdaním

Prejdi si to sám, než výstup odovzdáš:

- [ ] počet obcí vo výstupe = počet obcí v okrese
- [ ] každý kandidát má poradové číslo
- [ ] poradové čísla v každej súťaži idú od 1 bez dier a bez opakovania
- [ ] každá obec so `status: "hotove"` má aspoň jeden zdroj s `otvorene: true`
- [ ] žiadne meno nepochádza z pamäte
- [ ] mená majú diakritiku
- [ ] JSON je platný
- [ ] pri mestských častiach sú súťaže `starosta_mc` a `poslanec_mz_mc`,
      nie `starosta` a `poslanec_oz`

Na záver napíš krátke zhrnutie: koľko obcí hotových, koľko čaká na zverejnenie,
koľko sa nenašlo a pri ktorých treba ručný prepis.

---

## 7. Prečo to takto

Pár vecí, ktoré vyzerajú ako zbytočná prísnosť, ale majú dôvod:

**Kód obce, nie názov.** Názvy obcí sa na Slovensku opakujú — „Nová Ves“,
„Lehota“, „Hôrka“ existujú viackrát v rôznych okresoch. Podľa názvu sa výstup
priradiť nedá.

**Poradové číslo je kľúč.** Kandidatúra sa v databáze identifikuje dvojicou
súťaž + číslo na lístku. Preto sa opakovaný import nezduplikuje — a preto je
diera v číslovaní znak, že sa niečo prehliadlo.

**Vek, nie rok narodenia.** Osoby sa neskôr párujú naprieč voľbami podľa mena
a roku narodenia. Rok odhadnutý z veku by párovanie pokazil a dvom rôznym
ľuďom by pripísal spoločnú históriu.

**Prázdny zoznam je informácia.** Rozdiel medzi „obec ešte nezverejnila“
a „nikto nekandiduje“ je pre portál podstatný a z chýbajúceho riadku sa
nedá prečítať.
