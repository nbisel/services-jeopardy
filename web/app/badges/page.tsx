"use client";

import { useMemo, useState } from "react";
import { useScores } from "@/lib/useScores";
import { monthlyBadges } from "@/lib/badges";
import { todayStr } from "@/lib/rules";
import LoadingSpinner from "@/components/LoadingSpinner";
import BadgesView from "@/components/BadgesView";

export default function BadgesPage() {
  const { entries, loading, error } = useScores();
  const [monthOffset, setMonthOffset] = useState(0);

  const today = todayStr();
  const base = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1 + monthOffset, 1);
  const year = base.getFullYear();
  const month = base.getMonth() + 1;
  const monthLabel = base.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const badges = useMemo(() => monthlyBadges(entries, year, month), [entries, year, month]);

  if (loading) return <LoadingSpinner label="Loading badges" />;
  if (error) return <p className="text-center text-sm text-down">Couldn’t load data: {error}</p>;

  return (
    <BadgesView
      title="🏅 Monthly Badges"
      badges={badges}
      monthLabel={monthLabel}
      monthOffset={monthOffset}
      onPrev={() => setMonthOffset((o) => o - 1)}
      onNext={() => setMonthOffset((o) => Math.min(0, o + 1))}
      emptyLabel={`No badges earned in ${monthLabel} — no scores logged.`}
    />
  );
}
