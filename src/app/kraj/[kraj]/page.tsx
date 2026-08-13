import Link from "next/link";
import { notFound } from "next/navigation";
import { kraje, krajPodlaSlugu, obce, okresObce, okresyKraja } from "@/lib/data";
import {
  kandidatiNaPredseduKraja,
  poslanciKraja,
  zvolenyPredseda,
} from "@/lib/vuc";

export function generateStaticParams() {
  return kraje.map((k) => ({ kraj: k.slug }));
}

export default async function KrajPage({ params }: { params: Promise<{ kraj: string }> }) {
  const { kraj: slug } = await params;
  const kraj = krajPodlaSlugu(slug);
  if (!kraj) notFound();

  const okresy = okresyKraja(kraj.code);
  const pocetObci = obce.filter((o) => o.regionCode === kraj.code).length;
  const predseda = zvolenyPredseda(kraj.code);
  const kandidati = kandidatiNaPredseduKraja(kraj.code);
  const poslanci = poslanciKraja(kraj.code);
  const obvody = [...new Set(poslanci.map((p) => p.obvod))];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 flex flex-col gap-6">
      <div>
        <p className="text-sm text-[var(--ink-subtle)]">Samosprávny kraj</p>
        <h1 className="text-2xl font-bold">{kraj.name}</h1>
        <p className="mt-1 text-[var(--ink-muted)]">
          Sídlo {kraj.seat} · {okresy.length} okresov · {pocetObci.toLocaleString("sk")} obcí
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Okresy</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {okresy.map((o) => (
            <li key={o.code}>
              <Link
                href={`/okres/${kraj.slug}/${o.slug}`}
                className="card block p-3 hover:border-[var(--brand)]"
              >
                <span className="font-semibold">{o.name}</span>
                <span className="block text-sm text-[var(--ink-subtle)]">
                  {okresObce(o.code).length} obcí
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {predseda && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Župné voľby 2022</h2>

          <div className="card p-4">
            <div className="text-sm text-[var(--ink-subtle)]">Zvolený predseda</div>
            <div className="text-lg font-semibold">{predseda.name}</div>
            {predseda.party && (
              <div className="text-sm text-[var(--ink-muted)]">{predseda.party}</div>
            )}
            {predseda.share != null && (
              <div className="mt-1 text-sm tabular-nums text-[var(--ink-muted)]">
                {predseda.votes?.toLocaleString("sk")} hlasov · {predseda.share.toFixed(2)} %
              </div>
            )}
          </div>

          {kandidati.length > 0 && (
            <div className="card p-4">
              <div className="mb-2 text-sm text-[var(--ink-subtle)]">
                Kandidáti na predsedu ({kandidati.length})
              </div>
              <ul className="flex flex-col gap-2 text-sm">
                {kandidati.map((k) => (
                  <li key={`${k.ballotNumber}-${k.name}`}>
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="tabular-nums text-[var(--ink-subtle)]">
                        {k.ballotNumber}.
                      </span>
                      <span className={k.elected ? "font-semibold" : ""}>
                        {k.titles && (
                          <span className="font-normal text-[var(--ink-subtle)]">
                            {k.titles}{" "}
                          </span>
                        )}
                        {k.name}
                      </span>
                      {k.withdrawn && (
                        <span className="text-[var(--ink-subtle)]">
                          — vzdal sa kandidatúry
                        </span>
                      )}
                      {k.share != null && (
                        <span className="ml-auto tabular-nums text-[var(--ink-muted)]">
                          {k.votes != null && `${k.votes.toLocaleString("sk")} · `}
                          {k.share.toFixed(2)} %
                        </span>
                      )}
                    </div>
                    <div className="text-[var(--ink-subtle)]">
                      {[k.party, k.age != null ? `${k.age} rokov` : null, k.occupation]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {poslanci.length > 0 && (
            <details className="card p-4">
              <summary className="cursor-pointer text-sm text-[var(--ink-muted)]">
                Zvolení poslanci zastupiteľstva ({poslanci.length})
              </summary>
              <div className="mt-3 flex flex-col gap-4">
                {obvody.map((obvod) => (
                  <div key={obvod ?? "bez"}>
                    {obvod && (
                      <div className="mb-1 text-sm font-semibold">{obvod}</div>
                    )}
                    <ul className="flex flex-col gap-1 text-sm">
                      {poslanci
                        .filter((p) => p.obvod === obvod)
                        .map((p) => (
                          <li
                            key={`${p.obvod}-${p.name}`}
                            className="flex flex-wrap items-baseline gap-x-2"
                          >
                            <span>{p.name}</span>
                            <span className="text-[var(--ink-subtle)]">{p.party}</span>
                            {p.votes != null && (
                              <span className="ml-auto tabular-nums text-[var(--ink-muted)]">
                                {p.votes.toLocaleString("sk")}
                              </span>
                            )}
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
            </details>
          )}

          <p className="text-sm text-[var(--ink-subtle)]">
            Zdroj: Štatistický úrad SR. Voľby do orgánov samosprávnych krajov sa
            konali v ten istý deň ako komunálne — 29. 10. 2022.
          </p>
        </section>
      )}
    </div>
  );
}
