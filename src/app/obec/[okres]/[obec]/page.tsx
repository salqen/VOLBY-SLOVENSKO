import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  cestaObce,
  krajObce,
  mestskeCasti,
  obecPodlaSlugu,
  okresObceMeta,
  rodic,
  kandidatiStarostaObce,
  poslanciObce,
  starostaObce,
  subjektyObce,
  sutazeObce,
  TYP_POPIS,
  ucastObce,
} from "@/lib/data";
import { kandidatiPoslanciObce } from "@/lib/kandidati-poslanci";
import { ucastVucObce } from "@/lib/vuc";

/**
 * Profil obce — ťažisko portálu. Poradie blokov zodpovedá tomu, na čo sa ľudia
 * pýtajú: kde volím → čo volím → kto kandiduje → ako to dopadlo minule.
 *
 * Bloky, ku ktorým nemáme dáta, sa buď nezobrazia (okrsky), alebo povedia, na
 * čo sa čaká. Nikdy sa nič nedopĺňa odhadom.
 */

// 2 929 obcí sa pri builde negeneruje — stránky vznikajú na požiadanie.
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ okres: string; obec: string }>;
}): Promise<Metadata> {
  const { okres, obec } = await params;
  const najdena = obecPodlaSlugu(okres, obec);
  return { title: najdena ? najdena.name : "Obec sa nenašla" };
}

export default async function ObecPage({
  params,
}: {
  params: Promise<{ okres: string; obec: string }>;
}) {
  const { okres: okresSlug, obec: obecSlug } = await params;
  const obec = obecPodlaSlugu(okresSlug, obecSlug);
  if (!obec) notFound();

  const okres = okresObceMeta(obec.okresCode);
  const kraj = krajObce(obec.regionCode);
  const mesto = rodic(obec);
  const casti = mestskeCasti(obec.code);
  const ucast = ucastObce(obec.code);
  const starosta = starostaObce(obec.code);
  const kandidati = kandidatiStarostaObce(obec.code);
  const poslanci = poslanciObce(obec.code);
  const sutaze = sutazeObce(obec);
  const zDoplnkovych = starosta?.volby.startsWith("Doplnkové") ?? false;

  // Poslanci sa v mestách delia na volebné obvody; v malej obci je obvod jeden.
  const subjekty = subjektyObce(obec.code);
  const kandidatiPoslanci = kandidatiPoslanciObce(obec.code);
  const obvody = [...new Set(poslanci.map((p) => p.ward))];
  const obvodyKandidatov = [...new Set(kandidatiPoslanci.map((k) => k.ward))];
  const ucastVuc = ucastVucObce(obec.code);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 flex flex-col gap-8">
      <header>
        <p className="text-sm text-[var(--ink-subtle)]">
          {kraj && (
            <Link href={`/kraj/${kraj.slug}`} className="hover:text-[var(--ink)]">
              {kraj.name}
            </Link>
          )}
          {okres && kraj && (
            <>
              {" · "}
              <Link
                href={`/okres/${kraj.slug}/${okres.slug}`}
                className="hover:text-[var(--ink)]"
              >
                okres {okres.name}
              </Link>
            </>
          )}
        </p>
        <h1 className="text-3xl font-bold">{obec.name}</h1>
        <p className="mt-1 text-[var(--ink-muted)]">
          {TYP_POPIS[obec.type]}
          {mesto && (
            <>
              {" · časť mesta "}
              {cestaObce(mesto) ? (
                <Link href={cestaObce(mesto)!} className="hover:text-[var(--ink)]">
                  {mesto.name}
                </Link>
              ) : (
                mesto.name
              )}
            </>
          )}
        </p>
      </header>

      {/* Kde volím — blok sa zobrazí až keď budú okrsky potvrdené.
          Nepotvrdený okrsok sa nezobrazuje ani s upozornením. */}

      {sutaze.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">Čo sa tu volí</h2>
          <ul className="flex flex-col gap-2">
            {sutaze.map((s) => (
              <li key={s.office + s.uzemie} className="card p-3">
                <span className="font-semibold">{s.label}</span>
                <span className="block text-sm text-[var(--ink-subtle)]">{s.uzemie}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-[var(--ink-subtle)]">
            Odvodené z územnej štruktúry. Počty poslaneckých mandátov a volebné obvody
            sa dopĺňajú.
          </p>
        </section>
      )}

      {obec.type === "vojensky_obvod" && (
        <section className="card p-4">
          <h2 className="font-bold">Nekonajú sa tu voľby</h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Vojenský obvod nemá samosprávu — nevolí sa v ňom starosta ani zastupiteľstvo.
          </p>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Kandidáti 2026</h2>
        <div className="card p-4 text-[var(--ink-muted)]">
          Údaj sa dopĺňa. Kandidátne listiny zverejňujú obce približne 45 dní pred
          voľbami; dovtedy portál nemá čo zobraziť.
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Vedenie obce a výsledky 2022</h2>

        {starosta || ucast ? (
          <div className="flex flex-col gap-3">
            {starosta && (
              <div className="card p-4">
                <div className="text-sm text-[var(--ink-subtle)]">
                  Zvolený {obec.type === "mesto" ? "primátor" : "starosta"}
                  {" · "}
                  {starosta.volby}
                </div>
                <div className="text-lg font-semibold">{starosta.name}</div>
                {starosta.party && (
                  <div className="text-sm text-[var(--ink-muted)]">{starosta.party}</div>
                )}
                {zDoplnkovych && (
                  <p className="mt-2 text-sm text-[var(--ink-subtle)]">
                    Zvolený v doplnkových voľbách, nie v riadnych voľbách 2022.
                  </p>
                )}
              </div>
            )}

            {kandidati.length > 0 && (
              <div className="card p-4">
                <div className="mb-2 text-sm text-[var(--ink-subtle)]">
                  Kandidáti na starostu 2022
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
                        {[
                          k.party,
                          k.age != null ? `${k.age} rokov` : null,
                          k.occupation,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-[var(--ink-subtle)]">
                  NEKA — nezávislý kandidát. Vek ku dňu konania volieb. Poradie
                  podľa počtu hlasov, nie podľa hlasovacieho lístka.
                </p>
              </div>
            )}

            {ucast && (
              <div className="grid gap-3 sm:grid-cols-2">
                {ucast.turnout != null && (
                  <div className="card p-4">
                    <div className="text-sm text-[var(--ink-subtle)]">Účasť</div>
                    <div className="text-2xl font-bold tabular-nums">
                      {ucast.turnout.toFixed(2)} %
                    </div>
                  </div>
                )}
                {ucast.voters != null && (
                  <div className="card p-4">
                    <div className="text-sm text-[var(--ink-subtle)]">Zapísaní voliči</div>
                    <div className="text-2xl font-bold tabular-nums">
                      {ucast.voters.toLocaleString("sk")}
                    </div>
                  </div>
                )}
                {ucastVuc?.turnout != null && (
                  <div className="card p-4">
                    <div className="text-sm text-[var(--ink-subtle)]">
                      Účasť v župných voľbách
                    </div>
                    <div className="text-2xl font-bold tabular-nums">
                      {ucastVuc.turnout.toFixed(2)} %
                    </div>
                    <div className="mt-1 text-xs text-[var(--ink-subtle)]">
                      Iný hlasovací lístok než komunálne voľby.
                    </div>
                  </div>
                )}
              </div>
            )}


            <p className="text-sm text-[var(--ink-subtle)]">
              Zdroj: {(starosta ?? ucast)?.zdroj ?? "Štatistický úrad SR"}
            </p>
          </div>
        ) : (
          <div className="card p-4 text-[var(--ink-muted)]">
            Údaj sa dopĺňa. Výsledky za rok 2022 sú zatiaľ naplnené len pre časť obcí.
          </div>
        )}
      </section>

      {subjekty.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">Zloženie zastupiteľstva 2022</h2>
          <div className="card p-4">
            <ul className="flex flex-col gap-2 text-sm">
              {subjekty.map((s) => (
                <li key={s.party} className="flex flex-wrap items-baseline gap-x-3">
                  <span>{s.party}</span>
                  <span className="ml-auto tabular-nums font-semibold">
                    {s.seats}
                  </span>
                  {s.share != null && (
                    <span className="w-16 text-right tabular-nums text-[var(--ink-subtle)]">
                      {s.share.toFixed(1)} %
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-[var(--ink-subtle)]">
              Počet mandátov po voľbách 2022, nie dnešný stav.
            </p>
          </div>
        </section>
      )}

      {poslanci.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">
            Zvolení poslanci 2022{" "}
            <span className="text-base font-normal text-[var(--ink-subtle)]">
              ({poslanci.length})
            </span>
          </h2>
          {obvody.map((obvod) => {
            const vObvode = poslanci.filter((p) => p.ward === obvod);
            return (
              <div key={obvod ?? "bez"} className="card p-4">
                {obvody.length > 1 && obvod && (
                  <div className="mb-2 text-sm text-[var(--ink-subtle)]">
                    Volebný obvod {obvod}
                  </div>
                )}
                <ul className="flex flex-col gap-1 text-sm">
                  {vObvode.map((p) => (
                    <li key={p.name} className="flex flex-wrap items-baseline gap-x-2">
                      <span>{p.name}</span>
                      {p.party && (
                        <span className="text-[var(--ink-subtle)]">{p.party}</span>
                      )}
                      {p.votes != null && (
                        <span className="ml-auto tabular-nums text-[var(--ink-muted)]">
                          {p.votes.toLocaleString("sk")}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <p className="text-sm text-[var(--ink-subtle)]">
            Zloženie zastupiteľstva po voľbách 2022. Neskoršie zmeny (vzdanie sa
            mandátu, náhradníci) sa nezobrazujú.
          </p>
        </section>
      )}

      {kandidatiPoslanci.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">
            Kandidáti na poslancov 2022{" "}
            <span className="text-base font-normal text-[var(--ink-subtle)]">
              ({kandidatiPoslanci.length})
            </span>
          </h2>
          {/* Pri veľkých mestách sú to stovky mien — zbalené, aby nezavalili
              stránku, ale dostupné jedným kliknutím. */}
          <details className="card p-4">
            <summary className="cursor-pointer text-sm text-[var(--ink-muted)]">
              Zobraziť celé kandidátne listiny
            </summary>
            <div className="mt-3 flex flex-col gap-4">
              {obvodyKandidatov.map((obvod) => (
                <div key={obvod ?? "bez"}>
                  {obvodyKandidatov.length > 1 && obvod && (
                    <div className="mb-1 text-sm font-semibold">
                      Volebný obvod {obvod}
                    </div>
                  )}
                  <ul className="flex flex-col gap-1 text-sm">
                    {kandidatiPoslanci
                      .filter((k) => k.ward === obvod)
                      .map((k) => (
                        <li
                          key={`${k.ward}-${k.ballotNumber}-${k.name}`}
                          className="flex flex-wrap items-baseline gap-x-2"
                        >
                          <span className="tabular-nums text-[var(--ink-subtle)]">
                            {k.ballotNumber}.
                          </span>
                          <span>
                            {k.titles && (
                              <span className="text-[var(--ink-subtle)]">
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
                          <span className="ml-auto text-right text-[var(--ink-subtle)]">
                            {[k.party, k.age != null ? `${k.age} r.` : null]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        </section>
      )}

      {casti.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">Mestské časti</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {casti.map((c) => {
              const cesta = cestaObce(c);
              return (
                <li key={c.code}>
                  {cesta ? (
                    <Link href={cesta} className="card block p-3 hover:border-[var(--brand)]">
                      {c.name}
                    </Link>
                  ) : (
                    <span className="card block p-3">{c.name}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">O obci</h2>
        <dl className="card grid gap-x-6 gap-y-2 p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--ink-subtle)]">Kód obce</dt>
            <dd className="tabular-nums">{obec.code}</dd>
          </div>
          <div>
            <dt className="text-[var(--ink-subtle)]">Typ</dt>
            <dd>{TYP_POPIS[obec.type]}</dd>
          </div>
          {okres && (
            <div>
              <dt className="text-[var(--ink-subtle)]">Okres</dt>
              <dd>{okres.name}</dd>
            </div>
          )}
          {kraj && (
            <div>
              <dt className="text-[var(--ink-subtle)]">Kraj</dt>
              <dd>{kraj.name}</dd>
            </div>
          )}
          <div>
            <dt className="text-[var(--ink-subtle)]">Počet obyvateľov</dt>
            <dd>{obec.population?.toLocaleString("sk") ?? "údaj sa dopĺňa"}</dd>
          </div>
          <div>
            <dt className="text-[var(--ink-subtle)]">Webové sídlo</dt>
            <dd>
              {obec.website ? (
                <a href={obec.website} className="underline">
                  {obec.website}
                </a>
              ) : (
                "údaj sa dopĺňa"
              )}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
