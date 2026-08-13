import vucRaw from "@/data/vuc.json";

/**
 * Župné voľby 2022 — voľby do orgánov samosprávnych krajov.
 *
 * Kľúčom je kód kraja podľa ŠÚ SR (1–8), nie kód obce ani ISO kód, ktorý
 * používa zvyšok portálu. Prevod je v `KOD_KRAJA` nižšie.
 */

export interface KandidatPredseda {
  ballotNumber: number | null;
  name: string;
  titles?: string | null;
  age?: number | null;
  occupation?: string | null;
  residence?: string | null;
  party: string | null;
  votes?: number | null;
  share?: number | null;
  elected?: boolean;
  withdrawn?: boolean;
}

export interface PoslanecVuc {
  obvod: string | null;
  name: string;
  party: string | null;
  votes: number | null;
}

interface Vuc {
  predseda: Record<string, KandidatPredseda[]>;
  poslanci: Record<string, PoslanecVuc[]>;
  ucast: Record<string, { turnout: number | null; voters: number | null; zdroj: string }>;
}

const vuc = vucRaw as Vuc;

/** ISO kód kraja → kód, ktorý používajú tabuľky štatistického úradu. */
const KOD_KRAJA: Record<string, string> = {
  "SK-BL": "1",
  "SK-TA": "2",
  "SK-TC": "3",
  "SK-NI": "4",
  "SK-ZI": "5",
  "SK-BC": "6",
  "SK-PV": "7",
  "SK-KI": "8",
};

export function kandidatiNaPredseduKraja(isoKod: string): KandidatPredseda[] {
  return vuc.predseda[KOD_KRAJA[isoKod]] ?? [];
}

export function zvolenyPredseda(isoKod: string): KandidatPredseda | undefined {
  return kandidatiNaPredseduKraja(isoKod).find((k) => k.elected);
}

export function poslanciKraja(isoKod: string): PoslanecVuc[] {
  return vuc.poslanci[KOD_KRAJA[isoKod]] ?? [];
}

/** Účasť v župných voľbách je iná veličina než v komunálnych — iný lístok. */
export function ucastVucObce(obecKod: string) {
  return vuc.ucast[obecKod];
}
