import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Voľby na Slovensku — komunálne a župné",
    template: "%s · Voľby na Slovensku",
  },
  description:
    "Faktografický prehľad komunálnych a župných volieb pre všetky obce a mestá Slovenska.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sk">
      <body className="flex min-h-screen flex-col">
        <header className="border-b border-[var(--line)] bg-[var(--surface)]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="font-bold tracking-tight">
              Voľby na Slovensku
            </Link>
            <nav className="flex gap-4 text-sm text-[var(--ink-muted)]">
              <Link href="/kraje" className="hover:text-[var(--ink)]">Kraje</Link>
              <Link href="/o-portali/zdroje" className="hover:text-[var(--ink)]">Zdroje a pokrytie</Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-[var(--line)] px-4 py-6 text-sm text-[var(--ink-subtle)]">
          <div className="mx-auto max-w-6xl">
            Údaje o území: Štatistický úrad SR. Portál zverejňuje len overiteľné fakty.
          </div>
        </footer>
      </body>
    </html>
  );
}
