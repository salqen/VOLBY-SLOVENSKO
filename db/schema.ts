import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Volebný portál SR — dátová schéma.
 *
 * Rozsah: všetky obce Slovenska (~2 890, z toho ~141 miest), 79 okresov,
 * 8 samosprávnych krajov, mestské časti Bratislavy (17) a Košíc (22).
 * Voľby komunálne aj župné, s históriou naprieč rokmi.
 *
 * Schéma drží len overiteľné fakty — kto kandidoval, koľko dostal hlasov,
 * kde sa volí. Hodnotiaci obsah (analýzy, fact-check, sľuby, porovnávač
 * postojov) sem nepatrí; ten zostáva v redakčnom portáli pre jednotlivé mestá.
 *
 * Tri zásady, ktoré tvaru schémy vládnu:
 *   1. Prirodzené kľúče z oficiálnych registrov (kód obce ŠÚ SR), nie mená.
 *   2. Osoba existuje raz naprieč všetkými voľbami; kandidatúra je väzba.
 *   3. Každý fakt nesie svoj pôvod — bez zdroja sa nezverejňuje.
 */

// ── Číselníky ─────────────────────────────────────────────────────────────

export const municipalityTypeEnum = pgEnum("municipality_type", [
  "mesto",
  "obec",
  "mestska_cast",
  "vojensky_obvod",
]);

export const wardKindEnum = pgEnum("ward_kind", [
  "mz", // volebný obvod obecného / mestského zastupiteľstva
  "vuc", // volebný obvod zastupiteľstva samosprávneho kraja
]);

export const electionKindEnum = pgEnum("election_kind", [
  "komunalne",
  "vuc",
  "spojene", // komunálne a župné v jeden deň (od roku 2022)
]);

export const officeEnum = pgEnum("office", [
  "starosta", // obec
  "primator", // mesto
  "starosta_mc", // mestská časť BA / KE
  "poslanec_oz", // obecné / mestské zastupiteľstvo
  "poslanec_mz_mc", // miestne zastupiteľstvo mestskej časti
  "predseda_vuc",
  "poslanec_vuc",
]);

export const parityEnum = pgEnum("parity", ["even", "odd"]);

/** Na akom podklade stojí predbežne ohlásená kandidatúra. */
export const claimKindEnum = pgEnum("claim_kind", [
  "sam_oznamil", // kandidát vlastným kanálom
  "strana_nominovala", // vyhlásenie strany alebo koalície
  "medialne_potvrdene", // médium cituje priamo kandidáta
]);

export const importStatusEnum = pgEnum("import_status", [
  "new",
  "matched",
  "conflict",
  "merged",
  "rejected",
]);

// ── Geografia ─────────────────────────────────────────────────────────────

/** 8 samosprávnych krajov. `code` = ISO 3166-2 (SK-BL, SK-KI, …). */
export const regions = pgTable("regions", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 8 }).notNull().unique(),
  name: varchar("name", { length: 96 }).notNull(),
  slug: varchar("slug", { length: 96 }).notNull().unique(),
  seat: varchar("seat", { length: 96 }),
});

/** 79 okresov. */
export const counties = pgTable(
  "counties",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 8 }).notNull().unique(),
    name: varchar("name", { length: 96 }).notNull(),
    slug: varchar("slug", { length: 96 }).notNull(),
    regionId: integer("region_id")
      .references(() => regions.id)
      .notNull(),
  },
  (t) => [
    uniqueIndex("counties_region_slug_idx").on(t.regionId, t.slug),
    index("counties_region_idx").on(t.regionId),
  ],
);

/**
 * Obce, mestá a mestské časti.
 *
 * `code` je kód obce zo štatistického číselníka — jediný spoľahlivý kľúč.
 * Názvy sa v zdrojoch píšu rôzne a navyše sa opakujú: „Nová Ves“, „Lehota“
 * či „Hôrka“ existujú viackrát, preto slug sám osebe obec neidentifikuje
 * a je unikátny až v rámci okresu.
 *
 * Mestská časť ukazuje cez `parentId` na svoje mesto (BA, KE).
 */
export const municipalities = pgTable(
  "municipalities",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 12 }).notNull().unique(),
    name: varchar("name", { length: 128 }).notNull(),
    nameNormalized: varchar("name_normalized", { length: 128 }).notNull(),
    slug: varchar("slug", { length: 128 }).notNull(),
    type: municipalityTypeEnum("type").notNull(),
    countyId: integer("county_id")
      .references(() => counties.id)
      .notNull(),
    parentId: integer("parent_id"),
    ico: varchar("ico", { length: 8 }),
    population: integer("population"),
    areaKm2: real("area_km2"),
    lat: real("lat"),
    lng: real("lng"),
    website: varchar("website", { length: 512 }),
    /**
     * Platnosť záznamu v čase. Obce sa zlučujú, delia a premenúvajú, a výsledky
     * starších volieb sa viažu na vtedajšie usporiadanie — bez tohto by sa
     * historické výsledky priradili k jednotke, ktorá vtedy neexistovala.
     * `validTo = null` znamená platný dnes.
     */
    validFrom: date("valid_from"),
    validTo: date("valid_to"),
    /** Nástupnícka obec po zlúčení — kvôli presmerovaniu starých adries. */
    successorId: integer("successor_id"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    /**
     * Slug je jednoznačný len medzi dnes platnými obcami. Zaniknutá obec smie
     * mať rovnaký slug ako jej nástupca — inak by sa po zlúčení nedal záznam
     * uchovať. URL preto vždy vedie na platnú obec.
     */
    uniqueIndex("municipalities_county_slug_idx")
      .on(t.countyId, t.slug)
      .where(sql`${t.validTo} is null`),
    index("municipalities_name_idx").on(t.nameNormalized),
    index("municipalities_parent_idx").on(t.parentId),
    index("municipalities_type_idx").on(t.type),
    index("municipalities_valid_idx").on(t.validTo),
    /* Odkazy na seba samú — mestská časť na svoje mesto, zaniknutá obec
       na nástupcu. Deklarované takto, lebo v tele tabuľky sa na ňu ešte
       nedá odkazovať. */
    foreignKey({
      columns: [t.parentId],
      foreignColumns: [t.id],
      name: "municipalities_parent_fk",
    }),
    foreignKey({
      columns: [t.successorId],
      foreignColumns: [t.id],
      name: "municipalities_successor_fk",
    }),
  ],
);

/** Volebné obvody — pre poslancov zastupiteľstiev obcí aj krajov. */
export const wards = pgTable(
  "wards",
  {
    id: serial("id").primaryKey(),
    kind: wardKindEnum("kind").notNull(),
    code: varchar("code", { length: 32 }).notNull(),
    name: varchar("name", { length: 128 }).notNull(),
    /** Obvod obecného zastupiteľstva — patrí obci. */
    municipalityId: integer("municipality_id").references(() => municipalities.id, {
      onDelete: "cascade",
    }),
    /** Obvod krajského zastupiteľstva — patrí kraju, spravidla = okres. */
    regionId: integer("region_id").references(() => regions.id, { onDelete: "cascade" }),
    countyId: integer("county_id").references(() => counties.id),
  },
  (t) => [
    uniqueIndex("wards_kind_code_idx").on(t.kind, t.code),
    index("wards_municipality_idx").on(t.municipalityId),
    index("wards_region_idx").on(t.regionId),
  ],
);

/** Volebné okrsky. Celoslovensky rádovo 6 000 riadkov. */
export const precincts = pgTable(
  "precincts",
  {
    id: serial("id").primaryKey(),
    municipalityId: integer("municipality_id")
      .references(() => municipalities.id, { onDelete: "cascade" })
      .notNull(),
    number: integer("number").notNull(),
    venue: varchar("venue", { length: 256 }).notNull(),
    address: varchar("address", { length: 256 }).notNull(),
    lat: real("lat"),
    lng: real("lng"),
    /** Potvrdené človekom oproti originálu. Nepotvrdené sa nezobrazujú. */
    verified: boolean("verified").default(false).notNull(),
    sourceId: integer("source_id").references(() => sources.id),
    sourceUrl: varchar("source_url", { length: 768 }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("precincts_municipality_number_idx").on(t.municipalityId, t.number),
    index("precincts_verified_idx").on(t.verified),
  ],
);

/**
 * Rozsahy adries priradené okrskom.
 *
 * Najobjemnejšia tabuľka schémy — rádovo státisíce riadkov. `parity`
 * a rozsah čísel umožňujú vyhodnotiť zápisy typu „párne 2 – 48“, ktoré
 * obce vo svojich zoznamoch používajú.
 */
export const addressRanges = pgTable(
  "address_ranges",
  {
    id: serial("id").primaryKey(),
    precinctId: integer("precinct_id")
      .references(() => precincts.id, { onDelete: "cascade" })
      .notNull(),
    municipalityId: integer("municipality_id")
      .references(() => municipalities.id, { onDelete: "cascade" })
      .notNull(),
    street: varchar("street", { length: 160 }).notNull(),
    streetNormalized: varchar("street_normalized", { length: 160 }).notNull(),
    numbersFrom: integer("numbers_from"),
    numbersTo: integer("numbers_to"),
    parity: parityEnum("parity"),
    rawLabel: varchar("raw_label", { length: 160 }),
  },
  (t) => [
    index("address_ranges_lookup_idx").on(t.municipalityId, t.streetNormalized),
    index("address_ranges_precinct_idx").on(t.precinctId),
  ],
);

// ── Voľby ─────────────────────────────────────────────────────────────────

/** Volebná udalosť. Spojené voľby sú jeden riadok s viacerými súťažami. */
export const elections = pgTable(
  "elections",
  {
    id: serial("id").primaryKey(),
    kind: electionKindEnum("kind").notNull(),
    electionDay: date("election_day").notNull(),
    name: varchar("name", { length: 128 }).notNull(),
    officialSource: varchar("official_source", { length: 768 }),
    resultsFinal: boolean("results_final").default(false).notNull(),
  },
  (t) => [uniqueIndex("elections_kind_day_idx").on(t.kind, t.electionDay)],
);

/**
 * Súťaž — jedna volená funkcia na jednom území v jedných voľbách.
 *
 * Práve táto tabuľka robí zo župných volieb bežný dátový riadok: pridanie
 * `predseda_vuc` nevyžaduje zmenu schémy. Celoslovensky vychádza rádovo
 * 6 000 – 9 000 súťaží na jeden volebný cyklus.
 *
 * Územie je práve jedno z troch odkazov podľa `office`:
 *   starosta / primátor / poslanec_oz  → municipalityId (+ wardId pri obvodoch)
 *   predseda_vuc                       → regionId
 *   poslanec_vuc                       → wardId (kind = 'vuc')
 */
export const races = pgTable(
  "races",
  {
    id: serial("id").primaryKey(),
    electionId: integer("election_id")
      .references(() => elections.id, { onDelete: "cascade" })
      .notNull(),
    office: officeEnum("office").notNull(),
    municipalityId: integer("municipality_id").references(() => municipalities.id, {
      onDelete: "cascade",
    }),
    wardId: integer("ward_id").references(() => wards.id, { onDelete: "cascade" }),
    regionId: integer("region_id").references(() => regions.id, { onDelete: "cascade" }),
    /** Počet mandátov. Pri starostovi a predsedovi kraja vždy 1. */
    seats: smallint("seats").default(1).notNull(),
  },
  (t) => [
    index("races_election_office_idx").on(t.electionId, t.office),
    index("races_municipality_idx").on(t.municipalityId, t.electionId),
    index("races_ward_idx").on(t.wardId),
    index("races_region_idx").on(t.regionId),
  ],
);

// ── Osoby a kandidatúry ───────────────────────────────────────────────────

/**
 * Osoba existuje raz naprieč všetkými voľbami a rokmi. Vďaka tomu sa dá
 * ukázať, že ten istý človek kandidoval v roku 2018 na starostu a v roku
 * 2026 na predsedu kraja — pri zlúčenej tabuľke kandidátov to nejde.
 */
export const people = pgTable(
  "people",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 128 }).notNull().unique(),
    fullName: varchar("full_name", { length: 160 }).notNull(),
    /** Bez diakritiky a titulov, zložky mena zoradené — kľúč na párovanie. */
    nameNormalized: varchar("name_normalized", { length: 160 }).notNull(),
    titles: varchar("titles", { length: 64 }),
    birthYear: smallint("birth_year"),
    photoUrl: varchar("photo_url", { length: 768 }),
    photoCredit: varchar("photo_credit", { length: 256 }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("people_normalized_idx").on(t.nameNormalized, t.birthYear)],
);

/** Iné podoby mena, pod ktorými osoba v zdrojoch vystupuje. */
export const personAliases = pgTable(
  "person_aliases",
  {
    id: serial("id").primaryKey(),
    personId: integer("person_id")
      .references(() => people.id, { onDelete: "cascade" })
      .notNull(),
    aliasNormalized: varchar("alias_normalized", { length: 160 }).notNull(),
  },
  (t) => [index("person_aliases_idx").on(t.aliasNormalized)],
);

// ── Politické subjekty ────────────────────────────────────────────────────

/**
 * Register strán a koalícií.
 *
 * Názvy strán sa v zdrojoch píšu rôzne — s pomlčkou aj bez, skratkou aj plným
 * názvom, s inou veľkosťou písmen. Bez normalizácie by sa nedalo spočítať,
 * koľko starostov má ktorá strana, čo je jedna z mála celoslovenských otázok,
 * ktorú portál vie zodpovedať.
 *
 * Nezávislí kandidáti majú jeden spoločný riadok s `type = 'nezavisly'`,
 * aby sa dali počítať rovnakým dotazom ako strany.
 */
export const partyTypeEnum = pgEnum("party_type", ["strana", "koalicia", "nezavisly"]);

export const parties = pgTable(
  "parties",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 256 }).notNull(),
    nameNormalized: varchar("name_normalized", { length: 256 }).notNull().unique(),
    shortName: varchar("short_name", { length: 64 }),
    type: partyTypeEnum("type").notNull(),
    slug: varchar("slug", { length: 128 }).notNull().unique(),
  },
  (t) => [index("parties_type_idx").on(t.type)],
);

/** Iné podoby názvu, pod ktorými sa strana v zdrojoch vyskytuje. */
export const partyAliases = pgTable(
  "party_aliases",
  {
    id: serial("id").primaryKey(),
    partyId: integer("party_id")
      .references(() => parties.id, { onDelete: "cascade" })
      .notNull(),
    aliasNormalized: varchar("alias_normalized", { length: 256 }).notNull().unique(),
  },
);

/**
 * Kandidatúra — osoba v konkrétnej súťaži.
 * Rádovo 50 000 – 60 000 riadkov na volebný cyklus.
 */
export const candidacies = pgTable(
  "candidacies",
  {
    id: serial("id").primaryKey(),
    personId: integer("person_id")
      .references(() => people.id, { onDelete: "cascade" })
      .notNull(),
    raceId: integer("race_id")
      .references(() => races.id, { onDelete: "cascade" })
      .notNull(),
    /** Poradové číslo na hlasovacom lístku. */
    ballotNumber: smallint("ballot_number"),
    /**
     * Reťazec presne tak, ako ho uvádza zdroj — nemení sa ani po normalizácii.
     * Spárovaná podoba je v `candidacy_parties`; obe si ponechávame, aby sa
     * dalo spätne overiť, čo bolo na listine a čo z toho spravil import.
     */
    party: varchar("party", { length: 256 }).notNull(),
    coalition: jsonb("coalition").$type<string[]>().default([]).notNull(),
    /** Zamestnanie tak, ako ho uvádza kandidátna listina. */
    occupation: varchar("occupation", { length: 256 }),
    age: smallint("age"),
    incumbent: boolean("incumbent").default(false).notNull(),
    /** Odstúpil — z lístka sa neodstraňuje, len sa označí. */
    withdrawn: boolean("withdrawn").default(false).notNull(),
    sourceId: integer("source_id").references(() => sources.id),
    sourceUrl: varchar("source_url", { length: 768 }),
    verified: boolean("verified").default(false).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("candidacies_race_ballot_idx").on(t.raceId, t.ballotNumber),
    index("candidacies_person_idx").on(t.personId),
    index("candidacies_race_idx").on(t.raceId),
  ],
);

/**
 * Spárovanie kandidatúry so stranami. Pri koalícii vzniká viac riadkov —
 * preto samostatná tabuľka a nie stĺpec.
 */
export const candidacyParties = pgTable(
  "candidacy_parties",
  {
    candidacyId: integer("candidacy_id")
      .references(() => candidacies.id, { onDelete: "cascade" })
      .notNull(),
    partyId: integer("party_id")
      .references(() => parties.id, { onDelete: "cascade" })
      .notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.candidacyId, t.partyId] }),
    index("candidacy_parties_party_idx").on(t.partyId),
  ],
);

/**
 * Predbežne ohlásené kandidatúry — dočasná tabuľka pre obdobie pred
 * zverejnením kandidátnych listín.
 *
 * Zámerne stojí mimo `candidacies` a nikdy do nej nezapisuje. Až po
 * zverejnení úradnej listiny sa tieto riadky označia `supersededAt`
 * a prestanú sa zobrazovať; oficiálne údaje vzniknú nezávisle od nuly.
 * Keby sa predbežné údaje miešali s úradnými, nedalo by sa spätne
 * povedať, ktorý údaj pochádza z akého podkladu.
 *
 * Väzba je na obec a funkciu, nie na súťaž: pred zverejnením listiny nie je
 * známe, v ktorom volebnom obvode kandidát pobeží.
 */
export const preliminaryCandidates = pgTable(
  "preliminary_candidates",
  {
    id: serial("id").primaryKey(),
    municipalityId: integer("municipality_id")
      .references(() => municipalities.id, { onDelete: "cascade" })
      .notNull(),
    office: officeEnum("office").notNull(),
    fullName: varchar("full_name", { length: 160 }).notNull(),
    nameNormalized: varchar("name_normalized", { length: 160 }).notNull(),
    titles: varchar("titles", { length: 64 }),
    /** Strana tak, ako ju uvádza ohlásenie; pred listinou nemusí platiť. */
    party: varchar("party", { length: 256 }),
    claimKind: claimKindEnum("claim_kind").notNull(),
    /** Kedy kandidatúra odznela — nie kedy sme ju našli. */
    declaredAt: date("declared_at"),
    sourceUrl: varchar("source_url", { length: 768 }).notNull(),
    sourceLabel: varchar("source_label", { length: 256 }).notNull(),
    sourcePublisher: varchar("source_publisher", { length: 128 }),
    quote: text("quote"),
    note: text("note"),
    /** Naplní sa v deň zverejnenia úradnej listiny. Potom sa nezobrazuje. */
    supersededAt: timestamp("superseded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("preliminary_municipality_office_name_idx").on(
      t.municipalityId,
      t.office,
      t.nameNormalized,
    ),
    index("preliminary_active_idx").on(t.supersededAt),
  ],
);

/** Výsledok kandidatúry. */
export const results = pgTable(
  "results",
  {
    id: serial("id").primaryKey(),
    candidacyId: integer("candidacy_id")
      .references(() => candidacies.id, { onDelete: "cascade" })
      .notNull()
      .unique(),
    votes: integer("votes").notNull(),
    share: real("share"),
    elected: boolean("elected").default(false).notNull(),
    sourceId: integer("source_id").references(() => sources.id),
  },
  (t) => [index("results_elected_idx").on(t.elected)],
);

/** Účasť za súťaž. Zdroj: definitívne výsledky ŠÚ SR. */
export const turnout = pgTable(
  "turnout",
  {
    id: serial("id").primaryKey(),
    raceId: integer("race_id")
      .references(() => races.id, { onDelete: "cascade" })
      .notNull()
      .unique(),
    voters: integer("voters"),
    ballotsCast: integer("ballots_cast"),
    validBallots: integer("valid_ballots"),
    turnoutPct: real("turnout_pct"),
    sourceId: integer("source_id").references(() => sources.id),
  },
);

// ── Zber dát ──────────────────────────────────────────────────────────────

export const sources = pgTable("sources", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 256 }).notNull(),
  baseUrl: varchar("base_url", { length: 512 }),
  license: varchar("license", { length: 128 }),
  enabled: boolean("enabled").default(true).notNull(),
});

/**
 * Každý stiahnutý súbor doslova, aj keď sa nezmenil.
 *
 * Bez tejto tabuľky sa pri neskoršej námietke nedá doložiť, odkiaľ údaj
 * pochádza — obce svoje PDF prepisujú a mažú. Zároveň umožňuje opraviť
 * parser a prehnať staré podklady znova bez opätovného sťahovania.
 */
export const rawDocuments = pgTable(
  "raw_documents",
  {
    id: serial("id").primaryKey(),
    sourceId: integer("source_id")
      .references(() => sources.id)
      .notNull(),
    url: varchar("url", { length: 1024 }).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
    httpStatus: smallint("http_status"),
    etag: varchar("etag", { length: 256 }),
    contentType: varchar("content_type", { length: 128 }),
    /** SHA-256 obsahu — rovnaký hash znamená, že sa nič nespracúva. */
    contentHash: varchar("content_hash", { length: 64 }).notNull(),
    storagePath: varchar("storage_path", { length: 768 }).notNull(),
    bytes: integer("bytes"),
  },
  (t) => [
    uniqueIndex("raw_documents_hash_idx").on(t.contentHash),
    index("raw_documents_url_idx").on(t.url),
  ],
);

/** Rozparsované riadky pred spárovaním s jadrom. */
export const importRecords = pgTable(
  "import_records",
  {
    id: serial("id").primaryKey(),
    rawDocumentId: integer("raw_document_id")
      .references(() => rawDocuments.id, { onDelete: "cascade" })
      .notNull(),
    entityType: varchar("entity_type", { length: 32 }).notNull(),
    payload: jsonb("payload").notNull(),
    status: importStatusEnum("status").default("new").notNull(),
    /** Istota automatického spárovania, 0–1. Pod prahom ide na človeka. */
    confidence: real("confidence"),
    matchedId: integer("matched_id"),
    note: text("note"),
    parsedAt: timestamp("parsed_at", { withTimezone: true }).defaultNow().notNull(),
    resolvedBy: varchar("resolved_by", { length: 128 }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [
    index("import_records_status_idx").on(t.status, t.entityType),
    index("import_records_document_idx").on(t.rawDocumentId),
  ],
);

// ── Pokrytie ──────────────────────────────────────────────────────────────

export const datasetEnum = pgEnum("dataset", [
  "register",
  "vysledky_2022",
  "kandidati",
  "okrsky",
]);

export const coverageStatusEnum = pgEnum("coverage_status", [
  "chyba", // nemáme nič
  "ciastocne",
  "hotove",
  "overene", // potvrdené človekom
]);

/**
 * Stav naplnenia po obciach a druhoch dát.
 *
 * Pri jednom meste stačilo pozrieť sa na stránku. Pri 2 890 obciach je toto
 * jediný spôsob, ako vedieť, čo ešte chýba a kde sa zber zasekol — a zároveň
 * podklad pre verejnú stránku o pokrytí, ktorá portálu buduje dôveryhodnosť.
 */
export const coverage = pgTable(
  "coverage",
  {
    id: serial("id").primaryKey(),
    municipalityId: integer("municipality_id")
      .references(() => municipalities.id, { onDelete: "cascade" })
      .notNull(),
    dataset: datasetEnum("dataset").notNull(),
    status: coverageStatusEnum("status").default("chyba").notNull(),
    rowCount: integer("row_count"),
    note: varchar("note", { length: 256 }),
    checkedAt: timestamp("checked_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("coverage_municipality_dataset_idx").on(t.municipalityId, t.dataset),
    index("coverage_status_idx").on(t.dataset, t.status),
  ],
);

/** História zmien zverejnených údajov — doložiteľnosť navonok. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    entityType: varchar("entity_type", { length: 32 }).notNull(),
    entityId: integer("entity_id").notNull(),
    field: varchar("field", { length: 64 }).notNull(),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    reason: varchar("reason", { length: 256 }),
    changedBy: varchar("changed_by", { length: 128 }).notNull(),
    changedAt: timestamp("changed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("audit_log_entity_idx").on(t.entityType, t.entityId)],
);

// ── Prepojenia ────────────────────────────────────────────────────────────

/**
 * Väzby pre dotazovacie API Drizzle (`db.query.*`). Definované sú tie, po
 * ktorých portál naozaj chodí; ostatné sa dajú riešiť bežným joinom.
 *
 * Hlavná cesta portálu:
 *   obec → súťaže → kandidatúry → osoba + výsledok
 */

export const regionsRelations = relations(regions, ({ many }) => ({
  counties: many(counties),
  races: many(races),
}));

export const countiesRelations = relations(counties, ({ one, many }) => ({
  region: one(regions, { fields: [counties.regionId], references: [regions.id] }),
  municipalities: many(municipalities),
}));

export const municipalitiesRelations = relations(municipalities, ({ one, many }) => ({
  county: one(counties, {
    fields: [municipalities.countyId],
    references: [counties.id],
  }),
  parent: one(municipalities, {
    fields: [municipalities.parentId],
    references: [municipalities.id],
    relationName: "mestskeCasti",
  }),
  mestskeCasti: many(municipalities, { relationName: "mestskeCasti" }),
  races: many(races),
  precincts: many(precincts),
  coverage: many(coverage),
}));

export const precinctsRelations = relations(precincts, ({ one, many }) => ({
  municipality: one(municipalities, {
    fields: [precincts.municipalityId],
    references: [municipalities.id],
  }),
  addressRanges: many(addressRanges),
}));

export const addressRangesRelations = relations(addressRanges, ({ one }) => ({
  precinct: one(precincts, {
    fields: [addressRanges.precinctId],
    references: [precincts.id],
  }),
}));

export const electionsRelations = relations(elections, ({ many }) => ({
  races: many(races),
}));

export const racesRelations = relations(races, ({ one, many }) => ({
  election: one(elections, { fields: [races.electionId], references: [elections.id] }),
  municipality: one(municipalities, {
    fields: [races.municipalityId],
    references: [municipalities.id],
  }),
  ward: one(wards, { fields: [races.wardId], references: [wards.id] }),
  region: one(regions, { fields: [races.regionId], references: [regions.id] }),
  candidacies: many(candidacies),
  turnout: one(turnout),
}));

export const peopleRelations = relations(people, ({ many }) => ({
  candidacies: many(candidacies),
  aliases: many(personAliases),
}));

export const candidaciesRelations = relations(candidacies, ({ one, many }) => ({
  person: one(people, { fields: [candidacies.personId], references: [people.id] }),
  race: one(races, { fields: [candidacies.raceId], references: [races.id] }),
  result: one(results),
  parties: many(candidacyParties),
}));

export const candidacyPartiesRelations = relations(candidacyParties, ({ one }) => ({
  candidacy: one(candidacies, {
    fields: [candidacyParties.candidacyId],
    references: [candidacies.id],
  }),
  party: one(parties, {
    fields: [candidacyParties.partyId],
    references: [parties.id],
  }),
}));

export const partiesRelations = relations(parties, ({ many }) => ({
  candidacies: many(candidacyParties),
  aliases: many(partyAliases),
}));

export const resultsRelations = relations(results, ({ one }) => ({
  candidacy: one(candidacies, {
    fields: [results.candidacyId],
    references: [candidacies.id],
  }),
}));

export const turnoutRelations = relations(turnout, ({ one }) => ({
  race: one(races, { fields: [turnout.raceId], references: [races.id] }),
}));

export const coverageRelations = relations(coverage, ({ one }) => ({
  municipality: one(municipalities, {
    fields: [coverage.municipalityId],
    references: [municipalities.id],
  }),
}));
