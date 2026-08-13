import Link from "next/link";
import { kraje, obce, okresyKraja } from "@/lib/data";

export const metadata = { title: "Kraje" };

export default function Kraje() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Samosprávne kraje</h1>
      <ul className="flex flex-col gap-2">
        {kraje.map((k) => {
          const pocetObci = obce.filter((o) => o.regionCode === k.code).length;
          return (
            <li key={k.code} className="card p-4">
              <Link href={`/kraj/${k.slug}`} className="font-semibold hover:text-[var(--brand)]">
                {k.name}
              </Link>
              <div className="text-sm text-[var(--ink-subtle)]">
                sídlo {k.seat} · {okresyKraja(k.code).length} okresov ·{" "}
                {pocetObci.toLocaleString("sk")} obcí
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
