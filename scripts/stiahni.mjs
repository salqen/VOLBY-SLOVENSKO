import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { zdroje } from "./zdroje.mjs";

/**
 * Stiahne súbory z registra zdrojov do surovej vrstvy.
 *
 * Zodpovedá tabuľke `raw_documents` zo `SCHEMA.md`, zatiaľ ako súbory na disku
 * plus `index.json` s metadátami. Súbor sa uchováva **doslova** — keď niekto
 * neskôr namietne údaj, vieme ukázať presne ten podklad, z ktorého pochádza.
 *
 * Idempotencia stojí na hashi obsahu: rovnaký hash znamená, že sa nič
 * neprepisuje a nič ďalej nespracúva.
 *
 *   node scripts/stiahni.mjs              # len chýbajúce a zmenené
 *   node scripts/stiahni.mjs --vsetko     # znovu stiahne všetko
 */

const KOREN = path.resolve(import.meta.dirname, "..");
const SUROVE = path.join(KOREN, "data-raw");
const INDEX = path.join(SUROVE, "index.json");

const znovu = process.argv.includes("--vsetko");

fs.mkdirSync(SUROVE, { recursive: true });

const index = fs.existsSync(INDEX)
  ? JSON.parse(fs.readFileSync(INDEX, "utf8"))
  : {};

let stiahnute = 0;
let bezoZmeny = 0;
let chyby = 0;

for (const z of zdroje) {
  const subor = path.join(SUROVE, `${z.kluc}.xlsx`);
  const zaznam = index[z.kluc];

  if (!znovu && zaznam && fs.existsSync(subor)) {
    // Podmienené stiahnutie — server odpovie 304, ak sa súbor nezmenil.
    try {
      const hlavicky = {};
      if (zaznam.etag) hlavicky["if-none-match"] = zaznam.etag;
      const r = await fetch(z.url, { headers: hlavicky });
      if (r.status === 304) {
        bezoZmeny++;
        continue;
      }
      await uloz(z, r, subor);
      continue;
    } catch (e) {
      console.error(`  ✗ ${z.kluc}: ${e.message}`);
      chyby++;
      continue;
    }
  }

  try {
    const r = await fetch(z.url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    await uloz(z, r, subor);
  } catch (e) {
    console.error(`  ✗ ${z.kluc}: ${e.message}`);
    chyby++;
  }
}

async function uloz(z, odpoved, subor) {
  const data = Buffer.from(await odpoved.arrayBuffer());
  const hash = crypto.createHash("sha256").update(data).digest("hex");

  if (index[z.kluc]?.contentHash === hash && fs.existsSync(subor)) {
    bezoZmeny++;
    return;
  }

  fs.writeFileSync(subor, data);
  index[z.kluc] = {
    url: z.url,
    popis: z.popis,
    volby: z.volby,
    contentHash: hash,
    bytes: data.length,
    etag: odpoved.headers.get("etag") ?? null,
    fetchedAt: new Date().toISOString(),
  };
  stiahnute++;
  console.log(`  ✓ ${z.kluc.padEnd(32)} ${(data.length / 1024).toFixed(0)} kB`);
}

fs.writeFileSync(INDEX, JSON.stringify(index, null, 2));

console.log(
  `\nStiahnuté ${stiahnute} · bez zmeny ${bezoZmeny}${chyby ? ` · chyby ${chyby}` : ""}`,
);
if (chyby) process.exitCode = 1;
