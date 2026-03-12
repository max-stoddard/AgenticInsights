import { AgentMark } from "./AgentMark";

interface HeaderProps {
  onOpenMethodology: () => void;
}

export function Header({ onOpenMethodology }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 -mx-6 mb-6 flex items-center justify-between bg-surface-page/80 px-6 py-4 backdrop-blur-sm sm:-mx-8 sm:px-8 lg:-mx-12 lg:mb-8 lg:px-12">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-muted">
          <AgentMark className="h-5 w-5" />
        </span>
        <span className="text-base font-semibold tracking-[-0.03em] text-ink">Agentic Insights</span>
      </div>

      <div className="flex items-center gap-4">
        <span className="hidden items-center gap-1.5 text-xs text-ink-tertiary sm:flex">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
            <path
              fillRule="evenodd"
              d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z"
              clipRule="evenodd"
            />
          </svg>
          Local only
        </span>

        <button
          type="button"
          onClick={onOpenMethodology}
          className="flex items-center gap-1.5 rounded-lg bg-surface-muted px-3 py-1.5 text-sm font-medium text-ink-secondary no-underline transition-colors hover:bg-accent-muted hover:text-accent-hover"
        >
          How it works
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
            <path
              fillRule="evenodd"
              d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
