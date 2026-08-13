import ExcelJS from "exceljs";

/**
 * Parsery tabuliek Štatistického úradu.
 *
 * Tvar súborov je naprieč voľbami rovnaký:
 *   riadok 1  názov tabuľky, roztiahnutý cez všetky stĺpce
 *   riadok 2  prázdny
 *   riadok 3  hlavička
 *   riadok 4+ dáta
 *
 * Stĺpce sa hľadajú **podľa názvu v hlavičke**, nie podľa poradia. Keby úrad
 * v ďalších voľbách stĺpec pridal alebo presunul, parser to prežije; keby ho
 * premenoval, spadne hneď a nahlas, čo je lepšie než ticho zlé dáta.
 */

const RIADOK_HLAVICKY = 3;

export async function nacitajHarok(subor) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(subor);
  return wb.worksheets[0];
}

/** Mapa „názov stĺpca“ → index, z hlavičky. */
function hlavicka(ws) {
  const mapa = new Map();
  ws.getRow(RIADOK_HLAVICKY).eachCell({ includeEmpty: false }, (bunka, i) => {
    const nazov = String(bunka.value ?? "").replace(/\s+/g, " ").trim();
    if (nazov) mapa.set(nazov, i);
  });
  return mapa;
}

function stlpec(mapa, nazov, subor) {
  const i = mapa.get(nazov);
  if (!i) {
    throw new Error(
      `V hlavičke chýba stĺpec „${nazov}“ (${subor}). ` +
        `Nájdené: ${[...mapa.keys()].join(", ")}`,
    );
  }
  return i;
}

/** Hodnota bunky ako text; ExcelJS vracia pri vzorcoch objekt. */
function text(bunka) {
  const v = bunka?.value;
  if (v == null) return "";
  if (typeof v === "object" && "result" in v) return String(v.result ?? "").trim();
  if (typeof v === "object" && "richText" in v) {
    return v.richText.map((c) => c.text).join("").trim();
  }
  return String(v).trim();
}

function cislo(bunka) {
  const t = text(bunka).replace(/\s/g, "").replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Prejde dátové riadky a zavolá `spracuj` s prístupom k stĺpcom podľa názvu. */
function riadky(ws, subor, spracuj) {
  const mapa = hlavicka(ws);
  const daj = (nazov) => stlpec(mapa, nazov, subor);
  const out = [];
  for (let r = RIADOK_HLAVICKY + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const zaznam = spracuj({
      t: (nazov) => text(row.getCell(daj(nazov))),
      n: (nazov) => cislo(row.getCell(daj(nazov))),
    });
    if (zaznam) out.push(zaznam);
  }
  return out;
}

// ── Jednotlivé tabuľky ────────────────────────────────────────────────────

/** tab02bd — počet voličov a účasť podľa obcí. */
export function ucastObce(ws, subor) {
  return riadky(ws, subor, ({ t, n }) => {
    const kod = t("Kód obce");
    if (!kod) return null;
    return {
      obecKod: kod,
      okrskov: n("Počet okrskov"),
      voters: n("Počet zapísaných voličov"),
      ballotsCast: n("Počet zúčastnených voličov"),
      turnout: n("Účasť voličov v %"),
    };
  });
}

/** tab02bx — to isté za Bratislavu a Košice ako celok. */
export function ucastMesta(ws, subor) {
  return riadky(ws, subor, ({ t, n }) => {
    const kod = t("Kód mesta");
    if (!kod) return null;
    return {
      obecKod: kod,
      okrskov: n("Počet okrskov"),
      voters: n("Počet zapísaných voličov"),
      ballotsCast: n("Počet zúčastnených voličov"),
      turnout: n("Účasť voličov v %"),
    };
  });
}

/** tab04d — zvolení starostovia podľa obcí. */
export function zvoleniStarostovia(ws, subor) {
  return riadky(ws, subor, ({ t }) => {
    const kod = t("Kód obce");
    if (!kod) return null;
    const meno = t("Meno");
    const priezvisko = t("Priezvisko");
    if (!meno && !priezvisko) return null;
    return {
      obecKod: kod,
      name: `${meno} ${priezvisko}`.trim(),
      party: t("Politický subjekt") || null,
    };
  });
}

/** tab04x — zvolení primátori Bratislavy a Košíc. */
export function zvoleniStarostoviaMesta(ws, subor) {
  return riadky(ws, subor, ({ t }) => {
    const kod = t("Kód mesta");
    if (!kod) return null;
    return {
      obecKod: kod,
      name: `${t("Meno")} ${t("Priezvisko")}`.trim(),
      party: t("Politický subjekt") || null,
    };
  });
}

export const parsery = {
  ucastObce,
  vysledkyStarostovia,
  kandidatiNaStarostov,
  kandidatiNaPoslancov,
  subjektyVObci,
  kandidatiNaPredsedu,
  vysledkyPredseda,
  zvoleniPoslanciVuc,
  ucastObceVuc,
  zvoleniPoslanci,
  ucastMesta,
  zvoleniStarostovia,
  zvoleniStarostoviaMesta,
};

/**
 * tab05d — výsledky kandidátov na starostu podľa obcí.
 *
 * Zvolený kandidát je označený v stĺpci „Poznámka“ hodnotou „zvolený“, takže
 * sa víťaz nemusí odvodzovať z počtu hlasov. Pravidlo z VYSLEDKY-2022.md:
 * nič sa nedopočítava, ak to zdroj uvádza.
 */
export function vysledkyStarostovia(ws, subor) {
  return riadky(ws, subor, ({ t, n }) => {
    const kod = t("Kód obce");
    if (!kod) return null;
    const meno = `${t("Meno")} ${t("Priezvisko")}`.trim();
    if (!meno) return null;
    return {
      obecKod: kod,
      ballotNumber: n("Poradie na hlasovacom lístku"),
      name: meno,
      party: t("Politický subjekt") || null,
      votes: n("Počet platných hlasov"),
      share: n("Podiel platných hlasov v %"),
      elected: /zvolen/i.test(t("Poznámka")),
    };
  });
}

/** tab06d — zvolení poslanci zastupiteľstiev podľa obcí. */
export function zvoleniPoslanci(ws, subor) {
  return riadky(ws, subor, ({ t, n }) => {
    const kod = t("Kód obce");
    if (!kod) return null;
    const meno = `${t("Meno")} ${t("Priezvisko")}`.trim();
    if (!meno) return null;
    return {
      obecKod: kod,
      ward: t("Volebný obvod v obci") || null,
      name: meno,
      party: t("Politický subjekt") || null,
      votes: n("Počet platných hlasov"),
    };
  });
}

/**
 * tab0ad — kandidátne listiny na starostov.
 *
 * Oproti výsledkom (tab05d) pridáva titul, vek a zamestnanie, teda presne to,
 * čo je na kandidátnej listine, a naopak neobsahuje hlasy.
 *
 * Poznámka „X“ podľa vysvetliviek zdroja znamená, že sa kandidát vzdal alebo
 * ho odvolal politický subjekt (§ 174, resp. § 179 zákona č. 180/2014 Z. z.).
 * Z listiny sa neodstraňuje — na hlasovacom lístku zostal.
 */
export function kandidatiNaStarostov(ws, subor) {
  return riadky(ws, subor, ({ t, n }) => {
    const kod = t("Kód obce");
    if (!kod) return null;
    const meno = `${t("Meno")} ${t("Priezvisko")}`.trim();
    if (!meno) return null;
    return {
      obecKod: kod,
      ballotNumber: n("Poradie na hlasovacom lístku"),
      name: meno,
      titles: t("Titul") || null,
      age: n("Vek"),
      occupation: t("Zamestnanie") || null,
      party: t("Politický subjekt") || null,
      withdrawn: t("Poznámka").toUpperCase() === "X",
    };
  });
}

/**
 * tab0bd — kandidátne listiny na poslancov.
 *
 * Rovnaké polia ako pri starostoch, navyše volebný obvod. Najobjemnejšia
 * tabuľka celej sady — vyše 41 000 riadkov.
 */
export function kandidatiNaPoslancov(ws, subor) {
  return riadky(ws, subor, ({ t, n }) => {
    const kod = t("Kód obce");
    if (!kod) return null;
    const meno = `${t("Meno")} ${t("Priezvisko")}`.trim();
    if (!meno) return null;
    return {
      obecKod: kod,
      ward: t("Volebný obvod v obci") || null,
      ballotNumber: n("Poradie na hlasovacom lístku"),
      name: meno,
      titles: t("Titul") || null,
      age: n("Vek"),
      occupation: t("Zamestnanie") || null,
      party: t("Politický subjekt") || null,
      withdrawn: t("Poznámka").toUpperCase() === "X",
    };
  });
}

/**
 * tab07d — politické subjekty a počet zvolených poslancov podľa obcí.
 *
 * Zloženie zastupiteľstva po stranách. Je to jediný pohľad, ktorý priamo
 * odpovedá na otázku „kto obec riadi“ — z menného zoznamu poslancov by sa
 * musel skladať ručne.
 */
export function subjektyVObci(ws, subor) {
  return riadky(ws, subor, ({ t, n }) => {
    const kod = t("Kód obce");
    if (!kod) return null;
    const party = t("Politický subjekt");
    if (!party) return null;
    return {
      obecKod: kod,
      party,
      seats: n("Počet poslancov"),
      share: n("Podiel poslancov v %"),
    };
  });
}

// ── Župné voľby ───────────────────────────────────────────────────────────

/**
 * tab0a (OSK) — kandidátne listiny na predsedu samosprávneho kraja.
 * Oproti komunálnym pribúda obec trvalého pobytu.
 */
export function kandidatiNaPredsedu(ws, subor) {
  return riadky(ws, subor, ({ t, n }) => {
    const kraj = t("Kód kraja");
    if (!kraj) return null;
    const meno = `${t("Meno")} ${t("Priezvisko")}`.trim();
    if (!meno) return null;
    return {
      krajKod: kraj,
      ballotNumber: n("Poradie na hlasovacom lístku"),
      name: meno,
      titles: t("Titul") || null,
      age: n("Vek"),
      occupation: t("Zamestnanie") || null,
      residence: t("Obec trvalého pobytu") || null,
      party: t("Politický subjekt") || null,
      withdrawn: t("Poznámka").toUpperCase() === "X",
    };
  });
}

/**
 * tab06a (OSK) — výsledky volieb predsedu, súhrn za kraj.
 *
 * Zámerne nie tab06b: tá je členená po volebných obvodoch a súčet za kraj by
 * sa musel dopočítať. Zvolený je označený priamo, v stĺpci „Kandidát“.
 */
export function vysledkyPredseda(ws, subor) {
  return riadky(ws, subor, ({ t, n }) => {
    const kraj = t("Kód kraja");
    if (!kraj) return null;
    const meno = `${t("Meno")} ${t("Priezvisko")}`.trim();
    if (!meno) return null;
    const znacka = t("Kandidát");
    return {
      krajKod: kraj,
      ballotNumber: n("Poradie na hlasovacom lístku"),
      name: meno,
      party: t("Politický subjekt") || null,
      votes: n("Počet platných hlasov"),
      share: n("Podiel platných hlasov v %"),
      elected: /zvolen/i.test(znacka),
      withdrawn: znacka.toUpperCase() === "X",
    };
  });
}

/**
 * tab09b (OSK) — kandidáti na poslancov krajských zastupiteľstiev,
 * členené po volebných obvodoch. Zvolení sú označení v stĺpci „Kandidát“.
 */
export function zvoleniPoslanciVuc(ws, subor) {
  return riadky(ws, subor, ({ t, n }) => {
    const kraj = t("Kód kraja");
    if (!kraj) return null;
    const meno = `${t("Meno")} ${t("Priezvisko")}`.trim();
    if (!meno) return null;
    const znacka = t("Kandidát");
    return {
      krajKod: kraj,
      obvodKod: t("Kód volebného obvodu") || null,
      obvod: t("Názov volebného obvodu") || null,
      ballotNumber: n("Poradie na hlasovacom lístku"),
      name: meno,
      party: t("Politický subjekt") || null,
      votes: n("Počet platných hlasov"),
      share: n("Podiel platných hlasov v %"),
      elected: /zvolen/i.test(znacka),
      withdrawn: znacka.toUpperCase() === "X",
    };
  });
}

/**
 * tab02bd (OSK) — účasť v župných voľbách podľa obcí.
 *
 * Nedá sa použiť `ucastObce` z komunálnych volieb: tabuľka má stĺpec „Okrsok“
 * namiesto „Počet okrskov“, navyše volebný obvod a dva samostatné počty
 * platných lístkov — pre predsedu a pre zastupiteľstvo.
 */
export function ucastObceVuc(ws, subor) {
  return riadky(ws, subor, ({ t, n }) => {
    const kod = t("Kód obce");
    if (!kod) return null;
    return {
      obecKod: kod,
      obvod: t("Názov volebného obvodu") || null,
      voters: n("Počet zapísaných voličov"),
      ballotsCast: n("Počet zúčastnených voličov"),
      turnout: n("Účasť voličov v %"),
    };
  });
}
