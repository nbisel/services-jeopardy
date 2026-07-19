import type { Badge } from "@/lib/badges";
import NamePlate from "@/components/NamePlate";

/**
 * Compact monthly-badge strip shown above a leaderboard's Monthly tab.
 * Only badges with winners are passed in by the caller.
 */
export default function BadgeStrip({ badges }: { badges: Badge[] }) {
  if (badges.length === 0) return null;
  return (
    <div className="mb-5 flex flex-wrap justify-center gap-2">
      {badges.map((b) => (
        <div
          key={b.key}
          className="flex items-center gap-1.5 rounded-full border border-line bg-card2 py-1 pl-2 pr-1"
          title={`${b.label}: ${b.winners.map((w) => `${w.player} (${w.stat})`).join(", ")}`}
        >
          <span>{b.emoji}</span>
          <span className="text-xs font-semibold text-ink2">{b.label}</span>
          {b.winners.map((w) => (
            <NamePlate key={w.player} name={w.player} />
          ))}
        </div>
      ))}
    </div>
  );
}
