import uzemieRaw from "@/data/uzemie.json";
import vysledkyRaw from "@/data/vysledky.json";

/**
 * Dátová vrstva portálu.
 *
 * Zatiaľ číta z JSON vygenerovaného skriptom `scripts/build-data.mjs`, nie
 * z databázy. Tvar zodpovedá schéme v `db/schema.ts`, takže prechod na
 * Postgres znamená vymeniť telá týchto funkcií, nie stránky.
 */

export interface Kraj {
  code: string;
  nuts: string;
  name: string;
  slug: string;
  seat: string;
}

export interface Okres {
  code: string;
  lau1: string;
  name: string;
  slug: string;
  regionCode: string;
}

export type TypObce = "mesto" | "obec" | "mestska_cast" | "vojensky_obvod";

export interface Obec {
  code: string;
  name: string;
  nameNormalized: string;
  slug: string;
  type: TypObce;
  okresCode: string | null;
  regionCode: string | null;
  parentCode: string | null;
  population: number | null;
  lat: number | null;
  lng: number | null;
  website: string | null;
}

interface Uzemie {
  kraje: Kraj[];
  okresy: Okres[];
  obce: Obec[];
}

interface Ucast {
  turnout: number | null;
  voters: number | null;
  ballotsCast?: number | null;
  okrskov?: number | null;
  zdroj: string;
}

interface Starosta {
  name: string;
  party: string | null;
  volby: string;
  den: string;
  zdroj: string;
}

interface KandidatStarosta {
  ballotNumber: number | null;
  name: string;
  titles?: string | null;
  age?: number | null;
  occupation?: string | null;
  party: string | null;
  votes?: number | null;
  share?: number | null;
  elected?: boolean;
  /** Vzdal sa kandidatúry alebo ho odvolal politický subjekt (§ 174/179). */
  withdrawn?: boolean;
}

interface Poslanec {
  ward: string | null;
  name: string;
  party: string | null;
  votes: number | null;
}

interface Subjekt {
  party: string;
  seats: number | null;
  share: number | null;
}

interface Vysledky {
  ucast: Record<string, Ucast>;
  starostovia: Record<string, Starosta>;
  kandidatiStarosta: Record<string, KandidatStarosta[]>;
  poslanci: Record<string, Poslanec[]>;
  subjekty: Record<string, Subjekt[]>;
}

const uzemie = uzemieRaw as Uzemie;
const vysledky = vysledkyRaw as Vysledky;

export const kraje = uzemie.kraje;
export const okresy = uzemie.okresy;
export const obce = uzemie.obce;

const obecPodlaKodu = new Map(obce.map((o) => [o.code, o]));
const okresPodlaKodu = new Map(okresy.map((o) => [o.code, o]));
const krajPodlaKodu = new Map(kraje.map((k) => [k.code, k]));

export function krajPodlaSlugu(slug: string) {
  return kraje.find((k) => k.slug === slug);
}

export function okresPodlaSlugu(krajSlug: string, okresSlug: string) {
  const kraj = krajPodlaSlugu(krajSlug);
  if (!kraj) return undefined;
  return okresy.find((o) => o.slug === okresSlug && o.regionCode === kraj.code);
}

export function obecPodlaSlugu(okresSlug: string, obecSlug: string) {
  return obce.find(
    (o) => o.slug === obecSlug && okresPodlaKodu.get(o.okresCode ?? "")?.slug === okresSlug,
  );
}

export function okresObce(okresCode: string) {
  return obce
    .filter((o) => o.okresCode === okresCode)
    .sort((a, b) => a.name.localeCompare(b.name, "sk"));
}

export function okresyKraja(regionCode: string) {
  return okresy
    .filter((o) => o.regionCode === regionCode)
    .sort((a, b) => a.name.localeCompare(b.name, "sk"));
}


export function okresObceMeta(okresCode: string | null) {
  return okresCode ? okresPodlaKodu.get(okresCode) : undefined;
}

export function krajObce(code: string | null) {
  return code ? krajPodlaKodu.get(code) : undefined;
}

export function mestskeCasti(mestoCode: string) {
  return obce
    .filter((o) => o.parentCode === mestoCode)
    .sort((a, b) => a.name.localeCompare(b.name, "sk"));
}

export function rodic(obec: Obec) {
  return obec.parentCode ? obecPodlaKodu.get(obec.parentCode) : undefined;
}

/** Cesta na profil obce. Okres je v ceste preto, že názvy obcí sa opakujú. */
export function cestaObce(obec: Obec): string | null {
  const okres = okresObceMeta(obec.okresCode);
  if (!okres) return null;
  return `/obec/${okres.slug}/${obec.slug}`;
}

// ── Výsledky ──────────────────────────────────────────────────────────────

export function ucastObce(code: string) {
  return vysledky.ucast[code];
}

export function starostaObce(code: string) {
  return vysledky.starostovia[code];
}

export function kandidatiStarostaObce(code: string) {
  return vysledky.kandidatiStarosta[code] ?? [];
}

export function poslanciObce(code: string) {
  return vysledky.poslanci[code] ?? [];
}

/** Zloženie zastupiteľstva po stranách — kto obec po voľbách riadi. */
export function subjektyObce(code: string) {
  return vysledky.subjekty[code] ?? [];
}


/** Koľko obcí má aký druh dát — podklad pre stránku o pokrytí. */
export function pokrytie() {
  const volitelne = obce.filter((o) => o.type !== "vojensky_obvod");
  return {
    obceSpolu: volitelne.length,
    register: volitelne.length,
    ucast: Object.keys(vysledky.ucast).length,
    starostovia: Object.keys(vysledky.starostovia).length,
    kandidati: 0,
    okrsky: 0,
    poslanci: Object.keys(vysledky.poslanci).length,
    zDoplnkovych: Object.values(vysledky.starostovia).filter((s) =>
      s.volby.startsWith("Doplnkové"),
    ).length,
    vysledkyStarosta: Object.keys(vysledky.kandidatiStarosta).length,
    subjekty: Object.keys(vysledky.subjekty).length,
  };
}

// ── Vyhľadávanie ──────────────────────────────────────────────────────────

export function hladajObce(dotaz: string, limit = 40) {
  const q = dotaz
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
  if (q.length < 2) return [];

  const zhody = obce.filter((o) => o.nameNormalized.includes(q));

  // Zhoda od začiatku názvu je takmer vždy to, čo človek hľadá.
  return zhody
    .sort((a, b) => {
      const aZac = a.nameNormalized.startsWith(q) ? 0 : 1;
      const bZac = b.nameNormalized.startsWith(q) ? 0 : 1;
      if (aZac !== bZac) return aZac - bZac;
      return a.name.localeCompare(b.name, "sk");
    })
    .slice(0, limit);
}

export const TYP_POPIS: Record<TypObce, string> = {
  mesto: "mesto",
  obec: "obec",
  mestska_cast: "mestská časť",
  vojensky_obvod: "vojenský obvod",
};

// ── Odvodené súťaže ───────────────────────────────────────────────────────

export interface Sutaz {
  office: string;
  label: string;
  uzemie: string;
}

/**
 * Aké funkcie sa v obci volia. Odvodené z typu obce a jej zaradenia — teda
 * bez ďalšieho zdroja, len z registra. Zodpovedá kroku „kostra volieb“
 * v POSTUP.md.
 *
 * Vojenské obvody nemajú samosprávu, takže sa v nich nevolí nič.
 */
export function sutazeObce(obec: Obec): Sutaz[] {
  if (obec.type === "vojensky_obvod") return [];

  const kraj = krajObce(obec.regionCode);
  const okres = okresObceMeta(obec.okresCode);
  const zoznam: Sutaz[] = [];

  if (obec.type === "mestska_cast") {
    const mesto = rodic(obec);
    zoznam.push(
      { office: "starosta_mc", label: "Starosta mestskej časti", uzemie: obec.name },
      { office: "poslanec_mz_mc", label: "Poslanci miestneho zastupiteľstva", uzemie: obec.name },
    );
    if (mesto) {
      zoznam.push(
        { office: "primator", label: `Primátor mesta ${mesto.name}`, uzemie: mesto.name },
        { office: "poslanec_oz", label: "Poslanci mestského zastupiteľstva", uzemie: mesto.name },
      );
    }
  } else {
    zoznam.push({
      office: obec.type === "mesto" ? "primator" : "starosta",
      label: obec.type === "mesto" ? "Primátor mesta" : "Starosta obce",
      uzemie: obec.name,
    });
    zoznam.push({
      office: "poslanec_oz",
      label: obec.type === "mesto" ? "Poslanci mestského zastupiteľstva" : "Poslanci obecného zastupiteľstva",
      uzemie: obec.name,
    });
  }

  if (kraj) {
    zoznam.push({ office: "predseda_vuc", label: "Predseda samosprávneho kraja", uzemie: kraj.name });
    zoznam.push({
      office: "poslanec_vuc",
      label: "Poslanci zastupiteľstva kraja",
      uzemie: okres ? `volebný obvod ${okres.name}` : kraj.name,
    });
  }

  return zoznam;
}
