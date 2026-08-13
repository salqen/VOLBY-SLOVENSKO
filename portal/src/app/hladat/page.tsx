import Link from "next/link";
import { cestaObce, hladajObce, krajObce, okresObceMeta, TYP_POPIS } from "@/lib/data";

export const metadata = { title: "Vyhľadávanie" };

export default async function Hladat({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const najdene = hladajObce(q);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 flex flex-col gap-6">
      <form action="/hladat" className="flex gap-2">
        <input
          name="q"
          type="search"
          defaultValue={q}
          minLength={2}
          required
          aria-label="Názov obce alebo mesta"
          className="field"
        />
        <button className="btn btn-primary">Hľadať</button>
      </form>

      {q.trim().length < 2 ? (
        <p className="text-[var(--ink-muted)]">Zadajte aspoň dva znaky.</p>
      ) : najdene.length === 0 ? (
        <p className="text-[var(--ink-muted)]">
          Pre „{q}“ sa nenašla žiadna obec. Skúste iný tvar názvu — napríklad bez
          predpony mesta.
        </p>
      ) : (
        <>
          <p className="text-sm text-[var(--ink-subtle)]">
            Nájdené: {najdene.length}
          </p>
          <ul className="flex flex-col gap-2">
            {najdene.map((o) => {
              const cesta = cestaObce(o);
              const okres = okresObceMeta(o.okresCode);
              const kraj = krajObce(o.regionCode);
              return (
                <li key={o.code} className="card p-3">
                  {cesta ? (
                    <Link href={cesta} className="font-semibold hover:text-[var(--brand)]">
                      {o.name}
                    </Link>
                  ) : (
                    <span className="font-semibold">{o.name}</span>
                  )}
                  <span className="ml-2 text-sm text-[var(--ink-subtle)]">
                    {TYP_POPIS[o.type]}
                    {okres ? ` · okres ${okres.name}` : ""}
                    {kraj ? ` · ${kraj.name}` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
