import Link from "next/link";
import { notFound } from "next/navigation";
import {
  cestaObce,
  kraje,
  krajPodlaSlugu,
  okresObce,
  okresPodlaSlugu,
  okresyKraja,
  TYP_POPIS,
  ucastObce,
} from "@/lib/data";

export function generateStaticParams() {
  return kraje.flatMap((k) =>
    okresyKraja(k.code).map((o) => ({ kraj: k.slug, okres: o.slug })),
  );
}

export default async function OkresPage({
  params,
}: {
  params: Promise<{ kraj: string; okres: string }>;
}) {
  const { kraj: krajSlug, okres: okresSlug } = await params;
  const kraj = krajPodlaSlugu(krajSlug);
  const okres = okresPodlaSlugu(krajSlug, okresSlug);
  if (!kraj || !okres) notFound();

  const zoznam = okresObce(okres.code);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 flex flex-col gap-6">
      <div>
        <p className="text-sm text-[var(--ink-subtle)]">
          <Link href={`/kraj/${kraj.slug}`} className="hover:text-[var(--ink)]">
            {kraj.name}
          </Link>
        </p>
        <h1 className="text-2xl font-bold">Okres {okres.name}</h1>
        <p className="mt-1 text-[var(--ink-muted)]">{zoznam.length} obcí a miest</p>
      </div>

      <ul className="flex flex-col gap-2">
        {zoznam.map((o) => {
          const cesta = cestaObce(o);
          const ucast = ucastObce(o.code);
          return (
            <li key={o.code} className="card flex flex-wrap items-baseline gap-x-3 p-3">
              {cesta ? (
                <Link href={cesta} className="font-semibold hover:text-[var(--brand)]">
                  {o.name}
                </Link>
              ) : (
                <span className="font-semibold">{o.name}</span>
              )}
              <span className="text-sm text-[var(--ink-subtle)]">{TYP_POPIS[o.type]}</span>
              {ucast?.turnout != null && (
                <span className="ml-auto text-sm tabular-nums text-[var(--ink-muted)]">
                  účasť 2022: {ucast.turnout.toFixed(2)} %
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
