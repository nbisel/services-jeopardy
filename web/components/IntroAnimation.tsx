"use client";

import { useEffect, useState } from "react";

const WORDS = ["This", "Is", "JEOPARDY"];
const GROW_MS = 600;
const GAP_MS = 500;
const FINAL_HOLD_MS = 1000;
const FADE_MS = 600;
const STORAGE_KEY = "sjt-seen-intro";

type Status = "unknown" | "hidden" | "playing" | "fading";

export default function IntroAnimation() {
  const [status, setStatus] = useState<Status>("unknown");
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    localStorage.setItem(STORAGE_KEY, "1");
    setStatus(seen || reduced ? "hidden" : "playing");
  }, []);

  useEffect(() => {
    if (status !== "playing") return;
    const isLast = wordIndex === WORDS.length - 1;
    const timer = setTimeout(
      () => {
        if (isLast) setStatus("fading");
        else setWordIndex((i) => i + 1);
      },
      GROW_MS + (isLast ? FINAL_HOLD_MS : GAP_MS)
    );
    return () => clearTimeout(timer);
  }, [status, wordIndex]);

  useEffect(() => {
    if (status !== "fading") return;
    const timer = setTimeout(() => setStatus("hidden"), FADE_MS);
    return () => clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    const visible = status === "playing" || status === "fading";
    if (!visible) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [status]);

  if (status === "unknown" || status === "hidden") return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-board ${
        status === "fading" ? "intro-fade-out" : ""
      }`}
    >
      <span
        key={wordIndex}
        className="intro-word font-display text-6xl font-black tracking-wide text-gold sm:text-8xl"
      >
        {WORDS[wordIndex]}
      </span>
    </div>
  );
}
