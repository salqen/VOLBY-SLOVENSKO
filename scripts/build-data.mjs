import fs from "node:fs";
import path from "node:path";
import { nacitajHarok, parsery } from "./parsery.mjs";
import { volbyPodlaVeku, zdroje } from "./zdroje.mjs";

/**
 * Zostaví dátovú vrstvu portálu z registra obcí.
 *
 * Vstup:
 *   ../municipalities.csv          register vo formáte podľa OBCE-FORMAT.md
 *   ../CSV obci/rozbalene/lookup_sk_obec.csv   názvy okresov a kraje
 *
 * Výstup:
 *   src/data/uzemie.json           kraje, okresy, obce so slugmi
 *   src/data/vysledky.json         čo o výsledkoch zatiaľ vieme
 *
 * Register neobsahuje názvy okresov ani zaradenie do krajov — tie sa doťahujú
 * z lookup tabuľky spojením cez kód obce. Sú to dva rôzne číselníky okresov
 * (register má poradové 1–79, lookup má úradné 101, 601…), takže spojenie
 * musí ísť cez obec, nie cez okres.
 */

const KOREN = path.resolve(import.meta.dirname, "..");
const VYSTUP = path.resolve(import.meta.dirname, "..", "src", "data");

const KRAJE = [
  { code: "SK-BL", nuts: "SK010", name: "Bratislavský kraj", slug: "bratislavsky", seat: "Bratislava" },
  { code: "SK-TA", nuts: "SK021", name: "Trnavský kraj", slug: "trnavsky", seat: "Trnava" },
  { code: "SK-TC", nuts: "SK022", name: "Trenčiansky kraj", slug: "trenciansky", seat: "Trenčín" },
  { code: "SK-NI", nuts: "SK023", name: "Nitriansky kraj", slug: "nitriansky", seat: "Nitra" },
  { code: "SK-ZI", nuts: "SK031", name: "Žilinský kraj", slug: "zilinsky", seat: "Žilina" },
  { code: "SK-BC", nuts: "SK032", name: "Banskobystrický kraj", slug: "banskobystricky", seat: "Banská Bystrica" },
  { code: "SK-PV", nuts: "SK041", name: "Prešovský kraj", slug: "presovsky", seat: "Prešov" },
  { code: "SK-KI", nuts: "SK042", name: "Košický kraj", slug: "kosicky", seat: "Košice" },
];

/** Bez diakritiky, malé písmená — na vyhľadávanie aj na slug. */
function bezDiakritiky(text) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function naSlug(nazov) {
  return bezDiakritiky(nazov)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Minimalistický CSV parser — zvláda úvodzovky aj oddeľovač v poli. */
function citajCsv(subor, oddelovac) {
  const text = fs.readFileSync(subor, "utf8").replace(/^﻿/, "");
  const riadky = text.split(/\r?\n/).filter((r) => r.trim() !== "");
  const hlavicka = rozdel(riadky[0], oddelovac);
  return riadky.slice(1).map((r) => {
    const bunky = rozdel(r, oddelovac);
    return Object.fromEntries(hlavicka.map((h, i) => [h, (bunky[i] ?? "").trim()]));
  });
}

function rozdel(riadok, oddelovac) {
  const out = [];
  let akt = "";
  let vUvodzovkach = false;
  for (let i = 0; i < riadok.length; i++) {
    const z = riadok[i];
    if (z === '"') {
      if (vUvodzovkach && riadok[i + 1] === '"') {
        akt += '"';
        i++;
      } else vUvodzovkach = !vUvodzovkach;
    } else if (z === oddelovac && !vUvodzovkach) {
      out.push(akt);
      akt = "";
    } else akt += z;
  }
  out.push(akt);
  return out;
}

// ── Vstupy ────────────────────────────────────────────────────────────────

const register = citajCsv(path.join(KOREN, "municipalities.csv"), ",");
const lookup = citajCsv(
  path.join(KOREN, "CSV obci", "rozbalene", "lookup_sk_obec.csv"),
  ";",
);

const podlaKodu = new Map(lookup.map((r) => [r.obec_kod, r]));

// ── Okresy ────────────────────────────────────────────────────────────────
// Vzniknú z lookupu; ku každému sa priradí kraj podľa NUTS3.

const okresyMap = new Map();
for (const r of lookup) {
  if (okresyMap.has(r.okres_kod)) continue;
  const kraj = KRAJE.find((k) => k.nuts === r.region_nuts3);
  if (!kraj) throw new Error(`Neznámy kraj ${r.region_nuts3} pri okrese ${r.county}`);
  okresyMap.set(r.okres_kod, {
    code: r.okres_kod,
    lau1: r.okres_lau1,
    name: r.county,
    slug: naSlug(r.county),
    regionCode: kraj.code,
  });
}
const okresy = [...okresyMap.values()].sort((a, b) => a.name.localeCompare(b.name, "sk"));

// ── Obce ──────────────────────────────────────────────────────────────────

const obce = [];
const chybajuceOkresy = [];

for (const r of register) {
  const l = podlaKodu.get(r.code);

  // Bratislava a Košice ako celok nie sú v lookupe ani v žiadnom okrese —
  // ich okres zostáva prázdny a v rozhraní sa uvádzajú pod krajom.
  let okresCode = l?.okres_kod ?? null;
  let regionCode = null;

  if (l) {
    regionCode = KRAJE.find((k) => k.nuts === l.region_nuts3)?.code ?? null;
  } else if (r.name === "Bratislava") {
    regionCode = "SK-BL";
  } else if (r.name === "Košice") {
    regionCode = "SK-KI";
  } else {
    chybajuceOkresy.push(`${r.code} ${r.name}`);
  }

  obce.push({
    code: r.code,
    name: r.name,
    nameNormalized: bezDiakritiky(r.name),
    slug: naSlug(r.name.replace(/^(Bratislava|Košice)-/, "")),
    type: r.type,
    okresCode,
    regionCode,
    parentCode: r.parent_code || null,
    population: r.population ? Number(r.population) : null,
    lat: r.lat ? Number(r.lat) : null,
    lng: r.lng ? Number(r.lng) : null,
    website: r.website || null,
  });
}

// ── Kontroly z OBCE-FORMAT.md, časť 6 ─────────────────────────────────────

const problemy = [];
const pocty = obce.reduce((a, o) => ((a[o.type] = (a[o.type] ?? 0) + 1), a), {});

if (okresy.length !== 79) problemy.push(`okresov ${okresy.length}, čakalo sa 79`);
if (pocty.mestska_cast !== 39)
  problemy.push(`mestských častí ${pocty.mestska_cast}, čaká sa presne 39`);
if (chybajuceOkresy.length)
  problemy.push(`bez okresu: ${chybajuceOkresy.join(", ")}`);

const zleKody = obce.filter((o) => !/^\d{6}$/.test(o.code));
if (zleKody.length) problemy.push(`kód nie je 6-miestny: ${zleKody.length}×`);

// Slug musí byť jednoznačný v rámci okresu.
const kolizie = new Map();
for (const o of obce) {
  const kluc = `${o.okresCode}/${o.slug}`;
  kolizie.set(kluc, (kolizie.get(kluc) ?? 0) + 1);
}
const duplicity = [...kolizie].filter(([, n]) => n > 1);
for (const [kluc, n] of duplicity) {
  // Pri kolízii sa pripojí kód obce — pravidlo zo SCRAPING-OBCE.md.
  const [okres, slug] = kluc.split("/");
  for (const o of obce.filter((x) => x.okresCode === okres && x.slug === slug)) {
    o.slug = `${o.slug}-${o.code}`;
  }
  problemy.push(`slug „${slug}“ sa v okrese ${okres} opakuje ${n}× — rozlíšený kódom`);
}

// ── Výsledky zo stiahnutých tabuliek ──────────────────────────────────────

const SUROVE = path.resolve(import.meta.dirname, "..", "data-raw");
const platneKody = new Set(obce.map((o) => o.code));

/**
 * Bratislava a Košice ako celok nemajú kód v číselníku obcí — register im
 * dal vlastný, štatistický úrad iný. Prevod je preto ručný a vedomý.
 */
const KODY_MIEST = { "582000": "529000", "599981": "599000" };

const vysledky = {
  ucast: {}, // len z riadnych volieb 2022
  starostovia: {}, // najnovší platný — 2022 alebo doplnkové
  kandidatiStarosta: {}, // všetci kandidáti na starostu 2022
  poslanci: {}, // zvolení poslanci 2022
  subjekty: {}, // zloženie zastupiteľstva po stranách
};

/**
 * Župné voľby 2022 — kľúčom je kód kraja (1–8 podľa ŠÚ SR), nie kód obce.
 * Účasť sa ukladá po obciach, ale zvlášť od komunálnej: volič dostal iný
 * lístok a je to iná súťaž.
 */
const vuc = { predseda: {}, poslanci: {}, ucast: {} };

/** Kandidát na predsedu — spája listinu (tab0a) s výsledkami (tab06a). */
function predseda(krajKod, ballotNumber, name) {
  const zoznam = (vuc.predseda[krajKod] ??= []);
  let z = zoznam.find((k) => k.ballotNumber === ballotNumber);
  if (!z) {
    z = { ballotNumber, name };
    zoznam.push(z);
  }
  return z;
}

/** Kandidátne listiny na poslancov — samostatný, objemný súbor. */
const kandidatiPoslanci = {};

const nesparovane = new Set();

async function nacitaj(kluc, parserNazov) {
  const subor = path.join(SUROVE, kluc + ".xlsx");
  if (!fs.existsSync(subor)) {
    problemy.push("chýba stiahnutý súbor " + kluc + ".xlsx — spustite `npm run stiahni`");
    return [];
  }
  const ws = await nacitajHarok(subor);
  const out = [];
  for (const z of parsery[parserNazov](ws, kluc)) {
    // Župné tabuľky sú kľúčované krajom, nie obcou — tie prechádzajú bez
    // párovania na register obcí.
    if (z.obecKod === undefined) {
      out.push(z);
      continue;
    }
    const kod = KODY_MIEST[z.obecKod] ?? z.obecKod;
    if (!platneKody.has(kod)) {
      nesparovane.add(z.obecKod + " (" + kluc + ")");
      continue;
    }
    out.push({ ...z, kod });
  }
  return out;
}

/**
 * Voľby sa spracúvajú od najstarších po najnovšie. Starosta z doplnkových
 * volieb tak prepíše toho z roku 2022 — presne o to ide.
 *
 * Účasť sa naopak berie **len z riadnych volieb**: účasť v doplnkových
 * voľbách je iná veličina (jedna obec, iný termín, spravidla oveľa nižšia)
 * a zobraziť ju ako „účasť 2022“ by bolo zavádzajúce.
 */
let prepisaneDoplnkovymi = 0;

/**
 * Kandidát na starostu sa skladá z dvoch tabuliek — listiny (tab0ad) a
 * výsledkov (tab05d). Spája ich prirodzený kľúč **obec + poradie na
 * hlasovacom lístku**, presne ako to opisuje SCHEMA.md; vďaka tomu nezáleží
 * na tom, ktorá tabuľka sa spracuje skôr.
 */
function kandidat(kod, ballotNumber, name) {
  const zoznam = (vysledky.kandidatiStarosta[kod] ??= []);
  let z = zoznam.find((k) => k.ballotNumber === ballotNumber);
  if (!z) {
    z = { ballotNumber, name };
    zoznam.push(z);
  }
  return z;
}

for (const v of volbyPodlaVeku) {
  for (const z of zdroje.filter((z) => z.volby === v.kluc && z.parser)) {
    const zaznamy = await nacitaj(z.kluc, z.parser);

    if (z.parser === "ucastObceVuc") {
      for (const r of zaznamy) {
        vuc.ucast[r.kod] = { turnout: r.turnout, voters: r.voters, zdroj: v.zdroj };
      }
    }

    if (z.parser === "ucastObce" || z.parser === "ucastMesta") {
      if (v.druh !== "komunalne") continue;
      for (const r of zaznamy) {
        vysledky.ucast[r.kod] = {
          turnout: r.turnout,
          voters: r.voters,
          ballotsCast: r.ballotsCast,
          okrskov: r.okrskov,
          zdroj: v.zdroj,
        };
      }
    }

    if (z.parser === "kandidatiNaStarostov") {
      // Kandidátna listina — základ záznamu. Nesie titul, vek a zamestnanie,
      // ktoré tabuľka výsledkov neobsahuje.
      if (v.druh === "komunalne") {
        for (const r of zaznamy) {
          Object.assign(kandidat(r.kod, r.ballotNumber, r.name), {
            titles: r.titles,
            age: r.age,
            occupation: r.occupation,
            party: r.party,
            withdrawn: r.withdrawn,
          });
        }
      }
    }

    if (z.parser === "vysledkyStarostovia") {
      // Listiny kandidátov sa uchovávajú len z riadnych volieb; z doplnkových
      // berieme iba víťaza, inak by sa listiny dvoch volieb zmiešali.
      if (v.druh === "komunalne") {
        for (const r of zaznamy) {
          Object.assign(kandidat(r.kod, r.ballotNumber, r.name), {
            votes: r.votes,
            share: r.share,
            elected: r.elected,
            party: r.party,
          });
        }
      }
      for (const r of zaznamy.filter((x) => x.elected)) {
        if (vysledky.starostovia[r.kod] && v.druh === "doplnkove") prepisaneDoplnkovymi++;
        vysledky.starostovia[r.kod] = {
          name: r.name,
          party: r.party,
          volby: v.nazov,
          den: v.den,
          zdroj: v.zdroj,
        };
      }
    }

    if (z.parser === "zvoleniStarostovia" || z.parser === "zvoleniStarostoviaMesta") {
      for (const r of zaznamy) {
        // tab05d má prednosť — nesie aj hlasy a podiel.
        if (vysledky.starostovia[r.kod]) continue;
        vysledky.starostovia[r.kod] = {
          name: r.name,
          party: r.party,
          volby: v.nazov,
          den: v.den,
          zdroj: v.zdroj,
        };
      }
    }

    if (z.parser === "zvoleniPoslanci") {
      for (const r of zaznamy) {
        (vysledky.poslanci[r.kod] ??= []).push({
          ward: r.ward,
          name: r.name,
          party: r.party,
          votes: r.votes,
        });
      }
    }

    // ── Župné voľby ───────────────────────────────────────────────────────
    // Viažu sa na kraj a volebný obvod, nie na obec, preto vlastná vetva
    // a vlastný kľúč. Účasť v nich je iná veličina než v komunálnych voľbách
    // (iný lístok, iná súťaž), takže sa ukladá zvlášť.

    if (z.parser === "kandidatiNaPredsedu") {
      for (const r of zaznamy) {
        Object.assign(predseda(r.krajKod, r.ballotNumber, r.name), {
          titles: r.titles,
          age: r.age,
          occupation: r.occupation,
          residence: r.residence,
          party: r.party,
          withdrawn: r.withdrawn,
        });
      }
    }

    if (z.parser === "vysledkyPredseda") {
      for (const r of zaznamy) {
        Object.assign(predseda(r.krajKod, r.ballotNumber, r.name), {
          votes: r.votes,
          share: r.share,
          elected: r.elected,
          party: r.party,
        });
      }
    }

    if (z.parser === "zvoleniPoslanciVuc") {
      for (const r of zaznamy.filter((x) => x.elected)) {
        (vuc.poslanci[r.krajKod] ??= []).push({
          obvod: r.obvod,
          name: r.name,
          party: r.party,
          votes: r.votes,
        });
      }
    }

    if (z.parser === "subjektyVObci") {
      for (const r of zaznamy) {
        (vysledky.subjekty[r.kod] ??= []).push({
          party: r.party,
          seats: r.seats,
          share: r.share,
        });
      }
    }

    if (z.parser === "kandidatiNaPoslancov") {
      // Vyše 41 000 riadkov — ide do vlastného súboru, aby ho načítavala len
      // stránka obce a nie každá stránka portálu.
      for (const r of zaznamy) {
        (kandidatiPoslanci[r.kod] ??= []).push({
          ward: r.ward,
          ballotNumber: r.ballotNumber,
          name: r.name,
          titles: r.titles,
          age: r.age,
          occupation: r.occupation,
          party: r.party,
          withdrawn: r.withdrawn,
        });
      }
    }
  }
}

for (const zoznam of Object.values(vysledky.kandidatiStarosta)) {
  // Odstúpení kandidáti nemajú hlasy — patria na koniec, nie medzi tých s nulou.
  zoznam.sort((a, b) => {
    if (a.withdrawn !== b.withdrawn) return a.withdrawn ? 1 : -1;
    return (b.votes ?? 0) - (a.votes ?? 0);
  });
}
for (const zoznam of Object.values(vysledky.poslanci)) {
  zoznam.sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));
}
for (const zoznam of Object.values(vuc.predseda)) {
  zoznam.sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));
}
for (const zoznam of Object.values(vuc.poslanci)) {
  zoznam.sort(
    (a, b) =>
      String(a.obvod ?? "").localeCompare(String(b.obvod ?? ""), "sk", { numeric: true }) ||
      (b.votes ?? 0) - (a.votes ?? 0),
  );
}
for (const zoznam of Object.values(vysledky.subjekty)) {
  zoznam.sort((a, b) => (b.seats ?? 0) - (a.seats ?? 0));
}
for (const zoznam of Object.values(kandidatiPoslanci)) {
  // Podľa obvodu a potom podľa poradia na lístku — tak, ako to volič vidí.
  zoznam.sort(
    (a, b) =>
      String(a.ward ?? "").localeCompare(String(b.ward ?? ""), "sk", { numeric: true }) ||
      (a.ballotNumber ?? 0) - (b.ballotNumber ?? 0),
  );
}

if (nesparovane.size) {
  problemy.push(
    "kódy obcí bez záznamu v registri (" +
      nesparovane.size +
      "): " +
      [...nesparovane].slice(0, 6).join(", ") +
      (nesparovane.size > 6 ? " …" : ""),
  );
}

// ── Kontroly z VYSLEDKY-2022.md, časť 6 ───────────────────────────────────

let nesediUcast = 0;
for (const u of Object.values(vysledky.ucast)) {
  if (u.voters && u.ballotsCast && u.turnout != null) {
    if (Math.abs((u.ballotsCast / u.voters) * 100 - u.turnout) > 0.1) nesediUcast++;
  }
}
if (nesediUcast) problemy.push("účasť nesedí s počtami pri " + nesediUcast + " obciach");

let viacZvolenych = 0;
let sucetPodielov = 0;
let bezVysledkov = 0;

for (const zoznam of Object.values(vysledky.kandidatiStarosta)) {
  if (zoznam.filter((k) => k.elected).length > 1) viacZvolenych++;

  // Obec, kde je listina, ale ani jeden kandidát nemá výsledok — voľby sa tam
  // nekonali alebo sa nedopočítali. Nie je to chyba súčtu, je to iný stav,
  // a miešať ich do jedného čísla by zakrylo oboje.
  const sVysledkom = zoznam.filter((k) => k.share != null);
  if (sVysledkom.length === 0) {
    bezVysledkov++;
    continue;
  }

  const s = sVysledkom.reduce((a, k) => a + k.share, 0);
  if (sVysledkom.length > 1 && (s < 99.5 || s > 100.5)) sucetPodielov++;
}

if (viacZvolenych)
  problemy.push("viac než jeden zvolený starosta pri " + viacZvolenych + " obciach");
if (sucetPodielov)
  problemy.push("súčet podielov mimo 99,5–100,5 % pri " + sucetPodielov + " obciach");
if (bezVysledkov)
  problemy.push(
    "obcí s kandidátnou listinou, ale bez výsledkov: " +
      bezVysledkov +
      " (voľby sa nekonali alebo neboli spracované)",
  );

// ── Zápis ─────────────────────────────────────────────────────────────────

fs.mkdirSync(VYSTUP, { recursive: true });
fs.writeFileSync(
  path.join(VYSTUP, "uzemie.json"),
  JSON.stringify({ kraje: KRAJE, okresy, obce }, null, 0),
);
fs.writeFileSync(path.join(VYSTUP, "vysledky.json"), JSON.stringify(vysledky, null, 0));
fs.writeFileSync(
  path.join(VYSTUP, "kandidati-poslanci.json"),
  JSON.stringify(kandidatiPoslanci, null, 0),
);
fs.writeFileSync(path.join(VYSTUP, "vuc.json"), JSON.stringify(vuc, null, 0));

// ── Hlásenie ──────────────────────────────────────────────────────────────

console.log("Územie");
console.log(`  kraje            ${KRAJE.length}`);
console.log(`  okresy           ${okresy.length}`);
console.log(`  obce spolu       ${obce.length}`);
for (const [t, n] of Object.entries(pocty).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${t.padEnd(15)}${n}`);
}
console.log("Výsledky");
console.log("  účasť 2022       " + Object.keys(vysledky.ucast).length + " obcí");
console.log("  starostovia      " + Object.keys(vysledky.starostovia).length + " obcí (z toho " + prepisaneDoplnkovymi + " z doplnkových volieb)");
const kandSpolu = Object.values(vysledky.kandidatiStarosta).reduce((a,z)=>a+z.length,0);
const kandOdstupeni = Object.values(vysledky.kandidatiStarosta).reduce((a,z)=>a+z.filter(k=>k.withdrawn).length,0);
const kandSVekom = Object.values(vysledky.kandidatiStarosta).reduce((a,z)=>a+z.filter(k=>k.age!=null).length,0);
console.log("  kandidáti 2022   " + kandSpolu + " na starostu v " + Object.keys(vysledky.kandidatiStarosta).length + " obciach");
console.log("                   z toho " + kandOdstupeni + " odstúpených, " + kandSVekom + " s vekom a zamestnaním");
console.log("  poslanci 2022    " + Object.values(vysledky.poslanci).reduce((a,z)=>a+z.length,0) + " zvolených v " + Object.keys(vysledky.poslanci).length + " obciach");
const kpSpolu = Object.values(kandidatiPoslanci).reduce((a,z)=>a+z.length,0);
const kpOdstupeni = Object.values(kandidatiPoslanci).reduce((a,z)=>a+z.filter(k=>k.withdrawn).length,0);
console.log("  kandidáti posl.  " + kpSpolu + " v " + Object.keys(kandidatiPoslanci).length + " obciach (odstúpených " + kpOdstupeni + ")");
console.log("Župné voľby 2022");
console.log("  kandidáti predseda " + Object.values(vuc.predseda).reduce((a,z)=>a+z.length,0) + " v " + Object.keys(vuc.predseda).length + " krajoch");
console.log("  zvolení predsedovia " + Object.values(vuc.predseda).filter(z=>z.some(k=>k.elected)).length);
console.log("  poslanci VÚC       " + Object.values(vuc.poslanci).reduce((a,z)=>a+z.length,0) + " zvolených");
console.log("  účasť              " + Object.keys(vuc.ucast).length + " obcí");
console.log("  zloženie zastup. " + Object.keys(vysledky.subjekty).length + " obcí, " + Object.values(vysledky.subjekty).reduce((a,z)=>a+z.length,0) + " strán");

if (problemy.length) {
  console.log("\nPoznámky:");
  for (const p of problemy) console.log(`  • ${p}`);
}
