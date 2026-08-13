# Štruktúra rozhrania

Web nad databázou z `DATABAZA.md`. Pokrýva všetky obce Slovenska, takže
rozhranie musí zvládnuť 2 890 obcí bez toho, aby ich niekde vypisovalo.

---

## 1. Východisko: vyhľadávanie, nie zoznam

Pri jednom meste bol vstupom rozcestník. Pri 2 890 obciach je zoznam
nepoužiteľný a rozhranie sa musí obrátiť: **návštevník zadá, kde býva,
a portál mu ukáže jeho voľby.**

Tri vstupy na úvodnej stránke, v tomto poradí:

1. **adresa** — najpresnejšie, vedie rovno na okrsok a všetky súťaže
2. **obec** — s našepkávaním; pri rovnakých názvoch rozlíšené okresom
   („Nová Ves, okres Levice“)
3. **kraj / okres** — pre toho, kto prehliada, nie hľadá

Celoslovenský prehľad výsledkov je až pod tým. Je zaujímavý, ale nie je to
dôvod, prečo ľudia prídu.

---

## 2. Adresár ciest

```
/                                     vyhľadávanie + celoslovenský prehľad
/hladat?q=…                           výsledky vyhľadávania

── Územie ────────────────────────────────────────────────────────
/kraj/<kraj>                          kraj: župné súťaže, okresy, súhrn
/okres/<kraj>/<okres>                 okres: obce, súhrn
/obec/<okres>/<obec>                  profil obce  ← ťažisko portálu
/obec/<okres>/<obec>/kandidati        kandidáti vo všetkých súťažiach
/obec/<okres>/<obec>/vysledky         výsledky, prepínač rokov
/obec/<okres>/<obec>/okrsky           okrsky a rozsahy ulíc
/mestska-cast/<mesto>/<mc>            mestské časti BA a KE

── Voľby ─────────────────────────────────────────────────────────
/volby                                zoznam volebných udalostí
/volby/<rok>                          celoslovenské výsledky
/volby/<rok>/kraj/<kraj>              výsledky kraja
/volby/<rok>/rebricky                 účasť, najtesnejšie súboje, nováčikovia

── Ľudia ─────────────────────────────────────────────────────────
/osoba/<slug>                         všetky kandidatúry naprieč rokmi

── Nástroje ──────────────────────────────────────────────────────
/moj-okrsok                           adresa → okrsok + všetky súťaže
/porovnat?obce=…                      porovnanie obcí vedľa seba

── O portáli ─────────────────────────────────────────────────────
/o-portali/metodika                   odkiaľ sú dáta, ako sa overujú
/o-portali/zdroje                     zoznam zdrojov a stav pokrytia
/o-portali/data                       otvorené dáta na stiahnutie
```

Cesta obce obsahuje okres, lebo **názvy obcí sa opakujú**. `/obec/nova-ves`
by bolo nejednoznačné; `/obec/levice/nova-ves` nie.

Bratislavský redakčný portál zostáva na `bratislavskevolby.sk` samostatne
a odkazuje sem na faktické podklady.

---

## 3. Profil obce — ťažisko

Väčšina návštev skončí tu. Poradie blokov zodpovedá tomu, na čo sa ľudia pýtajú:

1. **Kde volím** — okrsok podľa adresy, alebo výzva zadať adresu.
   Ak obec nemá potvrdené okrsky, blok sa nezobrazí vôbec.
2. **Čo volím** — zoznam súťaží tejto obce v najbližších voľbách. V bežnej
   obci štyri, v Bratislave a Košiciach šesť.
3. **Kandidáti** — po súťažiach, s číslom na lístku a stranou.
4. **Minulé voľby** — výsledok a účasť, s prepínačom rokov.
5. **O obci** — okres, kraj, počet obyvateľov, počet voličov, odkaz na web obce.

Pod všetkým odkaz na zdroje a dátum poslednej aktualizácie. Pri
faktografickom portáli to nie je pätka, ale súčasť obsahu.

---

## 4. Ako sa zobrazujú chýbajúce dáta

Pri 2 890 obciach nebude nikdy všetko naplnené. Rozhranie s tým počíta ako
so stavom, nie ako s výnimkou.

| Stav | Zobrazenie |
|---|---|
| údaj je a je overený | normálne |
| údaj je, nie je overený | s poznámkou o zdroji, bez zvýraznenia |
| údaj chýba | „údaj sa dopĺňa“ + čo naň čakáme |
| okrsky nepotvrdené | **blok sa nezobrazí vôbec** |

Nepotvrdený okrsok sa nezobrazí ani s upozornením. Návštevník si výstrahu
neprečíta a pôjde na zlú adresu — chýbajúca funkcia je menšia škoda.

Stav pokrytia je verejný na `/o-portali/zdroje`: koľko obcí má okrsky, koľko
kandidátov, odkedy. Portál, ktorý priznáva, čo nemá, je dôveryhodnejší než
portál, ktorý to skrýva.

---

## 5. Vyhľadanie okrsku

```
adresa → normalizácia ulice → obec → address_ranges → okrsok
                                   → obec → mestská časť
                                   → volebný obvod OZ
                                   → okres → kraj → volebný obvod VÚC
```

Výstupom **nie je jedna volebná miestnosť, ale zoznam všetkých súťaží**, ktoré
sa danej adresy týkajú, spolu s kandidátmi v nich. To je celý zmysel portálu:
volič v spojených voľbách dostane štyri až šesť lístkov a spravidla netuší,
čo je na ktorom.

Zadaná adresa sa neukladá.

---

## 6. Otvorené dáta

Portál stojí na verejných zdrojoch, tak ich vracia späť: `/o-portali/data`
ponúka výsledky, kandidátov a územnú štruktúru ako CSV a JSON, po voľbách
a po krajoch, s uvedením pôvodu.

Je to najlacnejší spôsob, ako si portál overí dôveryhodnosť — kto chce, môže
čísla prepočítať.

---

## 7. Čo rozhranie zámerne nemá

- **Hodnotenie kandidátov** — hviezdičky ani poradie. Portál radí kandidátov
  podľa čísla na lístku, nie podľa toho, koho považuje za lepšieho.
- **Diskusiu** — pri 2 890 obciach nie je moderovateľná.
- **Personalizáciu s účtom** — adresa sa neukladá, účet netreba.
- **Predpovede** — zverejňuje sa, čo sa stalo, nie čo sa má stať.
