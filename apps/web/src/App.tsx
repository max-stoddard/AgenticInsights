import { useEffect, useState } from "react";
import { DropletMark } from "./components/DropletMark";
import { HomeView } from "./views/HomeView";
import { PlaceholderView } from "./views/PlaceholderView";

type AppView = "home" | "usage-over-time" | "prompts" | "methodology";

const NAV_ITEMS: Array<{
  description: string;
  hash: `#${AppView}`;
  label: string;
  view: AppView;
}> = [
  {
    view: "home",
    hash: "#home",
    label: "Home",
    description: "Water usage estimate from your Codex history"
  },
  {
    view: "usage-over-time",
    hash: "#usage-over-time",
    label: "Usage over time",
    description: "A dedicated trend page for longer-range water usage analysis is coming soon."
  },
  {
    view: "prompts",
    hash: "#prompts",
    label: "Prompts",
    description: "Prompt-level water analysis and prompt attribution are coming soon."
  },
  {
    view: "methodology",
    hash: "#methodology",
    label: "Methodology",
    description: "A dedicated methodology page for assumptions, calibration, and exclusions is coming soon."
  }
];

function resolveViewFromHash(hash: string): AppView {
  const matchedItem = NAV_ITEMS.find((item) => item.hash === hash);
  return matchedItem?.view ?? "home";
}

export default function App() {
  const [activeView, setActiveView] = useState<AppView>(() => resolveViewFromHash(window.location.hash));
  const [hasVisitedHome, setHasVisitedHome] = useState(activeView === "home");

  useEffect(() => {
    const syncViewFromHash = () => {
      setActiveView(resolveViewFromHash(window.location.hash));
    };

    window.addEventListener("hashchange", syncViewFromHash);
    return () => {
      window.removeEventListener("hashchange", syncViewFromHash);
    };
  }, []);

  useEffect(() => {
    if (activeView === "home" && !hasVisitedHome) {
      setHasVisitedHome(true);
    }
  }, [activeView, hasVisitedHome]);

  const navigateTo = (view: AppView) => {
    const nextHash = NAV_ITEMS.find((item) => item.view === view)?.hash ?? "#home";
    setActiveView(view);
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  };

  const activeItem = NAV_ITEMS.find((item) => item.view === activeView) ?? NAV_ITEMS[0]!;
  const shouldRenderHome = hasVisitedHome || activeView === "home";

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-7xl">
        <div className="app-frame">
          <header className="border-b border-white/70 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <a
                href="#home"
                className="brand-lockup"
                onClick={(event) => {
                  event.preventDefault();
                  navigateTo("home");
                }}
              >
                <span className="brand-mark-shell">
                  <DropletMark className="h-8 w-8" />
                </span>
                <span>
                  <span className="section-kicker block">Water-weighted local estimate</span>
                  <span className="mt-1 block text-lg font-semibold tracking-[-0.04em] text-stone-950 sm:text-xl">
                    Codex Water Usage
                  </span>
                </span>
              </a>

              <nav aria-label="Primary" className="flex flex-wrap gap-2 sm:justify-end">
                {NAV_ITEMS.map((item) => {
                  const isActive = item.view === activeView;
                  return (
                    <a
                      key={item.view}
                      href={item.hash}
                      aria-current={isActive ? "page" : undefined}
                      className={isActive ? "nav-link nav-link-active" : "nav-link"}
                      onClick={(event) => {
                        event.preventDefault();
                        navigateTo(item.view);
                      }}
                    >
                      {item.label}
                    </a>
                  );
                })}
              </nav>
            </div>
          </header>

          <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            {shouldRenderHome ? (
              <div hidden={activeView !== "home"}>
                <HomeView />
              </div>
            ) : null}

            {activeView === "usage-over-time" ? (
              <PlaceholderView
                eyebrow="Usage over time"
                title="Dedicated timeline view coming soon"
                description={activeItem.description}
              />
            ) : null}

            {activeView === "prompts" ? (
              <PlaceholderView
                eyebrow="Prompts"
                title="Prompt-level water analysis coming soon"
                description={activeItem.description}
              />
            ) : null}

            {activeView === "methodology" ? (
              <PlaceholderView
                eyebrow="Methodology"
                title="Dedicated methodology page coming soon"
                description={activeItem.description}
              />
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
