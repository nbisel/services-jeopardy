"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";
import { useScores } from "@/lib/useScores";
import { raceData, wagerProfiles, weekdayWinRates } from "@/lib/stats";
import { fmtMoney, todayStr } from "@/lib/rules";

// Categorical slots validated against the navy card surface (dataviz skill);
// assigned to players in fixed alphabetical order, never cycled.
const SERIES_COLORS = [
  "#3987e5",
  "#199e70",
  "#c98500",
  "#008300",
  "#9085e9",
  "#e66767",
  "#d55181",
  "#d95926",
];

const CHROME = {
  grid: "#2a3373",
  axis: "#7d84ad",
  tooltipBg: "#1b2360",
  tooltipBorder: "#2a3373",
  ink: "#f4f5fb",
};

const tooltipStyle = {
  backgroundColor: CHROME.tooltipBg,
  border: `1px solid ${CHROME.tooltipBorder}`,
  borderRadius: 8,
  color: CHROME.ink,
  fontSize: 13,
};

export default function ChartsPage() {
  const { entries, loading, error } = useScores();
  const [monthOffset, setMonthOffset] = useState(0);

  const today = todayStr();
  const base = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1 + monthOffset, 1);
  const year = base.getFullYear();
  const month = base.getMonth() + 1;
  const monthLabel = base.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const race = useMemo(() => raceData(entries, year, month), [entries, year, month]);
  const weekdays = useMemo(() => weekdayWinRates(entries), [entries]);
  const wagers = useMemo(() => wagerProfiles(entries), [entries]);

  if (loading) return <p className="text-center text-sm text-ink3">Loading charts…</p>;
  if (error) return <p className="text-center text-sm text-down">Couldn’t load data: {error}</p>;
  if (entries.length === 0)
    return <p className="text-center text-sm text-ink3">No scores yet — charts will appear once the games begin.</p>;

  const lastIdx = race.data.length - 1;

  return (
    <div className="space-y-5">
      {/* Score race */}
      <section className="rounded-2xl border border-line bg-card p-5">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-bold">🏁 Score Race</h2>
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => setMonthOffset((o) => o - 1)}
              className="rounded-md border border-line px-2 py-1 text-ink2 hover:bg-card2"
              aria-label="Previous month"
            >
              ←
            </button>
            <span className="min-w-32 text-center font-semibold">{monthLabel}</span>
            <button
              onClick={() => setMonthOffset((o) => Math.min(0, o + 1))}
              disabled={monthOffset === 0}
              className="rounded-md border border-line px-2 py-1 text-ink2 hover:bg-card2 disabled:opacity-30"
              aria-label="Next month"
            >
              →
            </button>
          </div>
        </div>
        <p className="mb-4 text-xs text-ink3">Cumulative winnings through the month.</p>
        {race.data.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink3">No scores in {monthLabel}.</p>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={race.data} margin={{ top: 8, right: 64, bottom: 0, left: 8 }}>
              <CartesianGrid stroke={CHROME.grid} strokeWidth={1} vertical={false} />
              <XAxis
                dataKey="day"
                stroke={CHROME.axis}
                tick={{ fill: CHROME.axis, fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                stroke={CHROME.axis}
                tick={{ fill: CHROME.axis, fontSize: 12 }}
                tickLine={false}
                tickFormatter={(v: number) => fmtMoney(v)}
                width={70}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => fmtMoney(Number(v))}
                labelFormatter={(d) => `${monthLabel.split(" ")[0]} ${d}`}
              />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              {race.series.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                  label={(props: { x?: number | string; y?: number | string; index?: number }) =>
                    props.index === lastIdx && props.x !== undefined && props.y !== undefined ? (
                      <text
                        x={Number(props.x) + 6}
                        y={Number(props.y) + 4}
                        fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                        fontSize={12}
                        fontWeight={700}
                      >
                        {name}
                      </text>
                    ) : (
                      <g />
                    )
                  }
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Weekday win rate */}
      <section className="rounded-2xl border border-line bg-card p-5">
        <h2 className="mb-1 text-lg font-bold">📅 Team Correct Rate by Day</h2>
        <p className="mb-4 text-xs text-ink3">
          All-time, passes excluded. Saturday is the $2,000 question — handle with care.
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={weekdays} margin={{ top: 24, right: 8, bottom: 0, left: 8 }} barCategoryGap="28%">
            <CartesianGrid stroke={CHROME.grid} strokeWidth={1} vertical={false} />
            <XAxis
              dataKey="day"
              stroke={CHROME.axis}
              tick={{ fill: CHROME.axis, fontSize: 12 }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              stroke={CHROME.axis}
              tick={{ fill: CHROME.axis, fontSize: 12 }}
              tickLine={false}
              tickFormatter={(v: number) => `${v}%`}
              width={44}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: "rgba(245, 196, 81, 0.06)" }}
              formatter={(v, _name, item) => {
                const d = item?.payload as (typeof weekdays)[number] | undefined;
                return [
                  `${v}% (${d?.correct}/${d?.answered})${d?.best ? ` · hottest: ${d.best}` : ""}`,
                  "Correct",
                ];
              }}
            />
            <Bar dataKey="rate" fill="#3987e5" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              <LabelList dataKey="rate" position="top" fill={CHROME.ink} fontSize={12} formatter={(v) => `${v}%`} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* Wager risk profile */}
      <section className="rounded-2xl border border-line bg-card p-5">
        <h2 className="mb-1 text-lg font-bold">🎲 Sunday Risk Profiles</h2>
        <p className="mb-4 text-xs text-ink3">
          How much of their bankroll each player wagers vs. how often the bet pays off.
        </p>
        {wagers.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink3">No Sunday wagers yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 8, right: 48, bottom: 16, left: 8 }}>
              <CartesianGrid stroke={CHROME.grid} strokeWidth={1} />
              <XAxis
                type="number"
                dataKey="avgRiskPct"
                name="Avg wager"
                domain={[0, 100]}
                stroke={CHROME.axis}
                tick={{ fill: CHROME.axis, fontSize: 12 }}
                tickLine={false}
                tickFormatter={(v: number) => `${v}%`}
                label={{
                  value: "Average wager (% of bankroll)",
                  position: "insideBottom",
                  offset: -10,
                  fill: CHROME.axis,
                  fontSize: 12,
                }}
              />
              <YAxis
                type="number"
                dataKey="winRate"
                name="Win rate"
                domain={[0, 100]}
                stroke={CHROME.axis}
                tick={{ fill: CHROME.axis, fontSize: 12 }}
                tickLine={false}
                tickFormatter={(v: number) => `${v}%`}
                width={44}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ strokeDasharray: "3 3", stroke: CHROME.axis }}
                formatter={(v, name) => [`${v}%`, name]}
                labelFormatter={() => ""}
              />
              <Scatter data={wagers} fill="#f5c451" isAnimationActive={false}>
                <LabelList dataKey="player" position="right" fill={CHROME.ink} fontSize={12} />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        )}
        {wagers.length > 0 && (
          <p className="mt-2 text-xs text-ink3">
            Top-right = bold and brilliant. Bottom-right = the table thanks you for your donations.
          </p>
        )}
      </section>
    </div>
  );
}
