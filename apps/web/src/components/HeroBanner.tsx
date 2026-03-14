import { useEffect, useState } from "react";
import { FOOTPRINT_TEXT_CLASS_BY_PROPERTY } from "../lib/footprint";
import { useReducedMotion } from "../lib/useReducedMotion";

const words = [
  { key: "token", label: "tokens" },
  { key: "water", label: "water" },
  { key: "energy", label: "energy" },
  { key: "carbon", label: "carbon" }
] as const;

export function HeroBanner() {
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const activeWord = words[activeIndex] ?? words[0];

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % words.length);
    }, 2200);

    return () => window.clearInterval(timer);
  }, [reducedMotion]);

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-slate-200/70 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,249,255,0.92))] px-6 py-8 shadow-sm sm:px-8 sm:py-10">
      <div className="absolute inset-y-0 right-0 hidden w-40 bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.12),transparent_68%)] sm:block" />
      <div className="relative mx-auto max-w-4xl text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-ink sm:text-5xl">
          <span>Understand your agent</span>
          <span className="block sm:inline">
            {" "}
            <span
              className="inline-block align-baseline text-left sm:inline-grid sm:min-w-[4.5ch] sm:justify-items-start"
              data-testid="hero-word-slot"
            >
              <span
                key={activeWord.key}
                className={[FOOTPRINT_TEXT_CLASS_BY_PROPERTY[activeWord.key], reducedMotion ? undefined : "hero-word"].filter(
                  Boolean
                ).join(" ")}
              >
                {activeWord.label}
              </span>
            </span>
            {" "}
            <span>footprint locally.</span>
          </span>
        </h1>
      </div>
    </section>
  );
}
