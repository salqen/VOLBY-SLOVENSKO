/**
 * Register zdrojov — čo sa sťahuje a čo to obsahuje.
 *
 * Ďalšie voľby sa pridávajú sem, nie do sťahovača ani do parsera. Každá
 * položka opisuje jeden súbor: odkiaľ, čo v ňom je a ako sa má spracovať.
 *
 * Označenia tabuliek Štatistického úradu:
 *   …d  = členenie podľa obcí        (to potrebujeme najčastejšie)
 *   …x  = zvlášť za Bratislavu a Košice ako celok
 *   …a  = súhrn za kraje / SR
 */

const OSO2022 = "https://volby.statistics.sk/oso/oso2022/files/xlsx/OSO2022_SK_";

/**
 * `parser` odkazuje na funkciu v `parsery.mjs`. `null` znamená, že súbor
 * zatiaľ len sťahujeme a spracovanie príde neskôr — vďaka tomu sa dá
 * register rozširovať skôr, než je hotový parser.
 */
export const zdroje = [
  // ── Komunálne voľby 2022 ────────────────────────────────────────────────
  {
    kluc: "oso2022-ucast-obce",
    volby: "oso2022",
    url: `${OSO2022}tab02bd.xlsx`,
    popis: "Počet voličov a účasť podľa obcí",
    parser: "ucastObce",
  },
  {
    kluc: "oso2022-starostovia-obce",
    volby: "oso2022",
    url: `${OSO2022}tab04d.xlsx`,
    popis: "Zvolení starostovia podľa obcí",
    parser: "zvoleniStarostovia",
  },
  {
    kluc: "oso2022-starostovia-mesta",
    volby: "oso2022",
    url: `${OSO2022}tab04x.xlsx`,
    popis: "Zvolení primátori Bratislavy a Košíc",
    parser: "zvoleniStarostoviaMesta",
  },
  {
    kluc: "oso2022-ucast-mesta",
    volby: "oso2022",
    url: `${OSO2022}tab02bx.xlsx`,
    popis: "Počet voličov a účasť — Bratislava a Košice ako celok",
    parser: "ucastMesta",
  },
  {
    kluc: "oso2022-vysledky-starostovia",
    volby: "oso2022",
    url: `${OSO2022}tab05d.xlsx`,
    popis: "Výsledky kandidátov na starostu podľa obcí",
    parser: "vysledkyStarostovia",
  },
  {
    kluc: "oso2022-kandidati-starostovia",
    volby: "oso2022",
    url: `${OSO2022}tab0ad.xlsx`,
    popis: "Kandidáti na starostov podľa obcí",
    parser: "kandidatiNaStarostov",
  },
  {
    kluc: "oso2022-zvoleni-poslanci",
    volby: "oso2022",
    url: `${OSO2022}tab06d.xlsx`,
    popis: "Zvolení poslanci podľa obcí",
    parser: "zvoleniPoslanci",
  },
  {
    kluc: "oso2022-kandidati-poslanci",
    volby: "oso2022",
    url: `${OSO2022}tab0bd.xlsx`,
    popis: "Kandidáti na poslancov podľa obcí",
    parser: "kandidatiNaPoslancov",
  },
  {
    kluc: "oso2022-subjekty-obce",
    volby: "oso2022",
    url: `${OSO2022}tab07d.xlsx`,
    popis: "Politické subjekty a zvolení poslanci podľa obcí",
    parser: "subjektyVObci",
  },
];

// ── Župné voľby 2022 ────────────────────────────────────────────────────
//
// Voľby do orgánov samosprávnych krajov, konané v ten istý deň ako komunálne.
// Berieme členenie po krajoch, nie po obciach: výsledky predsedu po obciach
// majú 3,4 MB a zoznam poslancov po obciach 17 MB, čo je detail, ktorý portál
// nezobrazuje — kraj a volebný obvod stačia.

const OSK2022 = "https://volby.statistics.sk/osk/osk2022/files/xlsx/OSK2022_SK_";

zdroje.push(
  {
    kluc: "osk2022-kandidati-predseda",
    volby: "osk2022",
    url: `${OSK2022}tab0a.xlsx`,
    popis: "Kandidáti na predsedu samosprávneho kraja",
    parser: "kandidatiNaPredsedu",
  },
  {
    kluc: "osk2022-vysledky-predseda",
    volby: "osk2022",
    url: `${OSK2022}tab06a.xlsx`,
    popis: "Výsledky volieb predsedu — súhrn za kraj",
    parser: "vysledkyPredseda",
  },
  {
    kluc: "osk2022-zvoleni-poslanci",
    volby: "osk2022",
    url: `${OSK2022}tab09b.xlsx`,
    popis: "Zvolení poslanci zastupiteľstiev krajov",
    parser: "zvoleniPoslanciVuc",
  },
  {
    kluc: "osk2022-ucast-obce",
    volby: "osk2022",
    url: `${OSK2022}tab02bd.xlsx`,
    popis: "Počet voličov a účasť v župných voľbách podľa obcí",
    parser: "ucastObceVuc",
  },
);

// ── Doplnkové voľby 2022 – 2026 ─────────────────────────────────────────
//
// Keď starosta odstúpi alebo zomrie, obec volí znovu. Bez týchto kôl by na
// profile obce stál človek, ktorý funkciu už nezastáva — a je to údaj hneď
// pod titulkom. Kolá sa preto spracúvajú v poradí a novšie prepíše staršie.

const DOPLNKOVE = "https://volby.statistics.sk/oso/doplnkove2022/files/xlsx/OSO";

/** Kľúč kola je `RRRRMM`, čo je zároveň poradie — novšie číslo = novšie kolo. */
const KOLA = [
  { kod: "202303", nazov: "marec 2023" },
  { kod: "202309", nazov: "september 2023" },
  { kod: "202402", nazov: "február 2024" },
  { kod: "202410", nazov: "október 2024" },
  { kod: "202503", nazov: "marec 2025" },
  { kod: "202509", nazov: "september 2025" },
  { kod: "202603", nazov: "marec 2026" },
];

for (const kolo of KOLA) {
  zdroje.push(
    {
      kluc: `dopl${kolo.kod}-vysledky-starostovia`,
      volby: `dopl${kolo.kod}`,
      url: `${DOPLNKOVE}${kolo.kod}_SK_tab05d.xlsx`,
      popis: `Doplnkové voľby ${kolo.nazov} — výsledky kandidátov na starostu`,
      parser: "vysledkyStarostovia",
    },
    {
      kluc: `dopl${kolo.kod}-ucast-obce`,
      volby: `dopl${kolo.kod}`,
      url: `${DOPLNKOVE}${kolo.kod}_SK_tab02bd.xlsx`,
      popis: `Doplnkové voľby ${kolo.nazov} — počet voličov a účasť`,
      parser: "ucastObce",
    },
  );
}

export const volby = {
  oso2022: {
    nazov: "Voľby do orgánov samosprávy obcí 2022",
    den: "2022-10-29",
    poradie: "202210",
    druh: "komunalne",
    zdroj: "Štatistický úrad SR — volby.statistics.sk",
  },
  osk2022: {
    nazov: "Voľby do orgánov samosprávnych krajov 2022",
    den: "2022-10-29",
    poradie: "202211",
    druh: "vuc",
    zdroj: "Štatistický úrad SR — volby.statistics.sk",
  },
  ...Object.fromEntries(
    KOLA.map((k) => [
      `dopl${k.kod}`,
      {
        nazov: `Doplnkové voľby ${k.nazov}`,
        den: `${k.kod.slice(0, 4)}-${k.kod.slice(4)}`,
        poradie: k.kod,
        druh: "doplnkove",
        zdroj: "Štatistický úrad SR — volby.statistics.sk",
      },
    ]),
  ),
};

/** Voľby zoradené od najstarších — poradie, v ktorom sa importujú. */
export const volbyPodlaVeku = Object.entries(volby)
  .map(([kluc, v]) => ({ kluc, ...v }))
  .sort((a, b) => a.poradie.localeCompare(b.poradie));
