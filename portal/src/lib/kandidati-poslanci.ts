import kandidatiRaw from "@/data/kandidati-poslanci.json";

/**
 * Kandidátne listiny na poslancov — 41 614 záznamov, 6,2 MB.
 *
 * Zámerne v samostatnom module, nie v `data.ts`: načíta sa len tam, kde je
 * naozaj treba (profil obce). Keby viseli na spoločnej dátovej vrstve, ťahala
 * by ich každá stránka portálu vrátane vyhľadávania.
 */

export interface KandidatPoslanec {
  ward: string | null;
  ballotNumber: number | null;
  name: string;
  titles: string | null;
  age: number | null;
  occupation: string | null;
  party: string | null;
  withdrawn: boolean;
}

const kandidati = kandidatiRaw as Record<string, KandidatPoslanec[]>;

export function kandidatiPoslanciObce(code: string): KandidatPoslanec[] {
  return kandidati[code] ?? [];
}
