import { pokrytie } from "@/lib/data";

export const metadata = { title: "Zdroje a pokrytie" };

/**
 * Verejný stav naplnenia. Portál, ktorý priznáva, čo nemá, je dôveryhodnejší
 * než portál, ktorý to skrýva.
 */
export default function Zdroje() {
  const p = pokrytie();
  const pct = (n: number) => ((n / p.obceSpolu) * 100).toFixed(1);

  const riadky = [
    {
      dataset: "Územný register",
      stav: p.register,
      zdroj: "Štatistický úrad SR — číselník obcí",
      pozn: "Kraje, okresy, obce, mestá a mestské časti.",
    },
    {
      dataset: "Účasť vo voľbách 2022",
      stav: p.ucast,
      zdroj: "ŠÚ SR — volby.statistics.sk",
      pozn: "Riadne voľby 2022. Účasť v doplnkových voľbách je iná veličina a nezobrazuje sa tu.",
    },
    {
      dataset: "Zvolení starostovia",
      stav: p.starostovia,
      zdroj: "ŠÚ SR — riadne voľby 2022 aj doplnkové voľby 2022–2026",
      pozn: `Pri ${p.zDoplnkovych} obciach pochádza starosta z doplnkových volieb, nie z roku 2022 — bez nich by portál uvádzal človeka, ktorý funkciu už nezastáva.`,
    },
    {
      dataset: "Kandidáti na starostu 2022",
      stav: p.vysledkyStarosta,
      zdroj: "ŠÚ SR — výsledky podľa obcí",
      pozn: "Všetci kandidáti s počtom hlasov a podielom.",
    },
    {
      dataset: "Zvolení poslanci 2022",
      stav: p.poslanci,
      zdroj: "ŠÚ SR — výsledky podľa obcí",
      pozn: "Zloženie zastupiteľstiev vrátane volebných obvodov.",
    },
    {
      dataset: "Kandidáti 2026",
      stav: p.kandidati,
      zdroj: "kandidátne listiny obcí a krajov",
      pozn: "Listiny sa zverejňujú približne 45 dní pred voľbami.",
    },
    {
      dataset: "Volebné okrsky",
      stav: p.okrsky,
      zdroj: "zoznamy okrskov jednotlivých obcí",
      pozn: "Vyžadujú ručné potvrdenie oproti originálu. Kým obec nie je potvrdená, sekcia „Kde volím“ sa nezobrazuje.",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Zdroje a pokrytie</h1>
        <p className="mt-2 max-w-2xl text-[var(--ink-muted)]">
          Portál zverejňuje len údaje, ktoré sa dajú doložiť oficiálnym zdrojom.
          Táto stránka ukazuje, koľko z {p.obceSpolu.toLocaleString("sk")} obcí a miest
          má ktorý druh dát naplnený.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-xl border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-left">
              <th className="py-2 pr-4 font-semibold">Údaj</th>
              <th className="py-2 pr-4 font-semibold">Obcí</th>
              <th className="py-2 pr-4 font-semibold">Pokrytie</th>
              <th className="py-2 font-semibold">Zdroj</th>
            </tr>
          </thead>
          <tbody>
            {riadky.map((r) => (
              <tr key={r.dataset} className="border-b border-[var(--line)] align-top">
                <td className="py-3 pr-4">
                  <div className="font-medium">{r.dataset}</div>
                  <div className="text-[var(--ink-subtle)]">{r.pozn}</div>
                </td>
                <td className="py-3 pr-4 tabular-nums">
                  {r.stav.toLocaleString("sk")}
                </td>
                <td className="py-3 pr-4 tabular-nums">{pct(r.stav)} %</td>
                <td className="py-3 text-[var(--ink-muted)]">{r.zdroj}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="card p-4 text-sm text-[var(--ink-muted)]">
        <strong className="text-[var(--ink)]">Vojenské obvody.</strong> Záhorie, Lešť
        a Valaškovce sú v registri kvôli úplnosti územia, ale nemajú samosprávu — do
        pokrytia sa nezapočítavajú, lebo sa v nich nič nevolí.
      </section>
    </div>
  );
}
