import Link from "next/link";
import { kraje, obce, pokrytie } from "@/lib/data";

export default function Home() {
  const p = pokrytie();
  const miest = obce.filter((o) => o.type === "mesto").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold sm:text-4xl">
          Nájdite svoju obec a jej voľby
        </h1>
        <p className="max-w-2xl text-[var(--ink-muted)]">
          Komunálne a župné voľby pre všetkých {p.obceSpolu.toLocaleString("sk")} obcí
          a miest Slovenska. Portál uvádza len údaje, ktoré sa dajú doložiť
          oficiálnym zdrojom.
        </p>

        <form action="/hladat" className="flex max-w-xl gap-2">
          <input
            name="q"
            type="search"
            required
            minLength={2}
            placeholder="Zadajte názov obce alebo mesta…"
            aria-label="Názov obce alebo mesta"
            className="field"
          />
          <button type="submit" className="btn btn-primary">Hľadať</button>
        </form>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { k: "Obce a mestá", v: p.obceSpolu.toLocaleString("sk") },
          { k: "Z toho miest", v: miest },
          { k: "Okresy", v: 79 },
          { k: "Kraje", v: 8 },
        ].map((x) => (
          <div key={x.k} className="card p-4">
            <div className="text-sm text-[var(--ink-subtle)]">{x.k}</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{x.v}</div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Kraje</h2>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {kraje.map((k) => (
            <li key={k.code}>
              <Link href={`/kraj/${k.slug}`} className="card block p-3 hover:border-[var(--brand)]">
                <span className="font-semibold">{k.name}</span>
                <span className="block text-sm text-[var(--ink-subtle)]">{k.seat}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
