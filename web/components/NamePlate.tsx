/**
 * Contestant lower-third: a small dark plate with a thin gold accent rule
 * and the player's name in bold uppercase.
 */
export default function NamePlate({ name, rank }: { name: string; rank?: number }) {
  return (
    <span className="inline-flex max-w-full flex-col rounded-sm border-b-2 border-gold bg-board px-2.5 py-1 align-middle">
      <span className="truncate text-xs font-bold uppercase leading-tight tracking-wider text-ink">
        {rank !== undefined && <span className="mr-1.5 text-gold">#{rank}</span>}
        {name}
      </span>
    </span>
  );
}
