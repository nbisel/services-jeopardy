"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Today" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/records", label: "Records" },
  { href: "/charts", label: "Charts" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-card/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-1 px-4 py-3 sm:gap-4">
        <Link
          href="/"
          className="mr-2 shrink-0 text-lg font-black italic tracking-wide text-gold sm:mr-4"
        >
          SERVICES JEOPARDY!
        </Link>
        <nav className="flex gap-1 overflow-x-auto sm:gap-2">
          {LINKS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? "bg-gold text-board"
                    : "text-ink2 hover:bg-card2 hover:text-ink"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
