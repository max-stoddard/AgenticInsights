import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";

const fetchMock = vi.fn<typeof fetch>();

function mockDashboardResponses() {
  fetchMock.mockImplementation(async (input) => {
    const url = String(input);
    if (url.startsWith("/api/overview")) {
      return new Response(
        JSON.stringify({
          tokenTotals: {
            totalTokens: 1000,
            supportedTokens: 900,
            excludedTokens: 50,
            unestimatedTokens: 50
          },
          waterLitres: {
            low: 0.5,
            central: 1.2,
            high: 2.1
          },
          coverage: {
            supportedEvents: 9,
            excludedEvents: 1,
            tokenOnlyEvents: 1
          },
          diagnostics: {
            state: "ready",
            codexHome: "/tmp/.codex",
            message: null
          },
          exclusions: [
            {
              provider: "ollama",
              model: "qwen3.5:9b",
              tokens: 50,
              events: 1,
              reason: "Unsupported provider: ollama"
            }
          ],
          lastIndexedAt: Date.parse("2026-03-09T12:00:00.000Z"),
          calibration: {
            referenceEventCostUsd: 0.123,
            computedAt: Date.parse("2026-03-09T12:00:00.000Z"),
            supportedEventCount: 9,
            supportedMedianSource: "local_median_event_cost_usd"
          }
        }),
        { status: 200 }
      );
    }

    if (url.startsWith("/api/methodology")) {
      return new Response(
        JSON.stringify({
          pricingTable: [
            {
              provider: "openai",
              model: "gpt-5.3-codex",
              inputUsdPerMillion: 1.75,
              cachedInputUsdPerMillion: 0.175,
              outputUsdPerMillion: 14,
              docsUrl: "https://developers.openai.com/api/docs/models/gpt-5.3-codex"
            }
          ],
          benchmarkCoefficients: {
            low: 0.010585,
            central: 0.016904,
            high: 0.029926
          },
          calibration: {
            referenceEventCostUsd: 0.123,
            computedAt: Date.parse("2026-03-09T12:00:00.000Z"),
            supportedEventCount: 9,
            supportedMedianSource: "local_median_event_cost_usd"
          },
          exclusions: [],
          sourceLinks: [
            {
              label: "CACM DOI: Making AI Less 'Thirsty' (Li, Yang, Islam, Ren)",
              url: "https://doi.org/10.1145/3724499"
            },
            {
              label: "arXiv: Uncovering and Addressing the Secret Water Footprint of AI Models",
              url: "https://arxiv.org/abs/2304.03271"
            },
            { label: "OpenAI API pricing", url: "https://openai.com/api/pricing/" }
          ]
        }),
        { status: 200 }
      );
    }

    if (url.includes("bucket=day")) {
      return new Response(
        JSON.stringify({
          bucket: "day",
          points: [
            {
              key: "2026-03-09",
              label: "9 Mar 2026",
              tokens: 1000,
              excludedTokens: 50,
              unestimatedTokens: 50,
              waterLitres: {
                low: 0.5,
                central: 1.2,
                high: 2.1
              }
            }
          ]
        }),
        { status: 200 }
      );
    }

    if (url.includes("bucket=week")) {
      return new Response(
        JSON.stringify({
          bucket: "week",
          points: [
            {
              key: "2026-W11",
              label: "Week of 9 Mar 2026",
              tokens: 2000,
              excludedTokens: 100,
              unestimatedTokens: 100,
              waterLitres: {
                low: 1,
                central: 2.4,
                high: 4.2
              }
            }
          ]
        }),
        { status: 200 }
      );
    }

    return new Response(
      JSON.stringify({
        bucket: "month",
        points: []
      }),
      { status: 200 }
    );
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  window.location.hash = "";
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  window.location.hash = "";
});

describe("App", () => {
  it("loads the single-page dashboard with hero metric, chart, coverage, and roadmap", async () => {
    mockDashboardResponses();

    const { container } = render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText("1.20 L").length).toBeGreaterThan(0);
    });

    expect(screen.getByText(/Water used/i)).toBeInTheDocument();
    expect(screen.getByText(/Between 500.0 mL and 2.10 L/i)).toBeInTheDocument();
    expect(screen.getByText(/From 9 coding sessions/i)).toBeInTheDocument();
    expect(screen.getByText(/90% coverage/i)).toBeInTheDocument();

    expect(screen.getByText(/Usage over time/i)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Day" })).toHaveAttribute("aria-selected", "true");

    expect(screen.getByText("supported")).toBeInTheDocument();
    expect(screen.getByText("excluded")).toBeInTheDocument();

    expect(screen.getByText(/Prompt insights/i)).toBeInTheDocument();
    expect(screen.getByText(/Energy estimates/i)).toBeInTheDocument();
    expect(screen.getByText(/CO2 estimates/i)).toBeInTheDocument();

    expect(container.querySelectorAll('img[src="/agent.svg"]').length).toBeGreaterThan(0);
    expect(screen.getByText(/Copyright Max Stoddard 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/Last indexed 9 Mar 2026/i)).toBeInTheDocument();
  });

  it("switches time bucket via the toggle and fetches new timeseries", async () => {
    mockDashboardResponses();

    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText("1.20 L").length).toBeGreaterThan(0);
    });

    const dayTab = screen.getByRole("tab", { name: "Day" });
    dayTab.focus();
    fireEvent.keyDown(dayTab, { key: "ArrowRight", code: "ArrowRight" });

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Week" })).toHaveAttribute("aria-selected", "true");
    });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("bucket=week"));
    });

    fireEvent.click(screen.getByRole("tab", { name: "Month" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("bucket=month"));
    });
    expect(await screen.findByText("No water estimate available for this time range.")).toBeInTheDocument();
  });

  it("opens the methodology drawer and shows pricing and sources", async () => {
    mockDashboardResponses();

    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText("1.20 L").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByRole("button", { name: /How it works/i })[0]!);

    expect(await screen.findByRole("dialog", { name: /How it works/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/methodology");
    });

    expect(await screen.findByText(/gpt-5.3-codex/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /CACM DOI: Making AI Less 'Thirsty' \(Li, Yang, Islam, Ren\)/i })
    ).toHaveAttribute("href", "https://doi.org/10.1145/3724499");
  });

  it("shows neutral onboarding guidance when no local usage history is available", async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.startsWith("/api/overview")) {
        return new Response(
          JSON.stringify({
            tokenTotals: {
              totalTokens: 0,
              supportedTokens: 0,
              excludedTokens: 0,
              unestimatedTokens: 0
            },
            waterLitres: {
              low: 0,
              central: 0,
              high: 0
            },
            coverage: {
              supportedEvents: 0,
              excludedEvents: 0,
              tokenOnlyEvents: 0
            },
            diagnostics: {
              state: "no_data",
              codexHome: "/home/dev/.codex",
              message: "No Codex usage files were found in this directory yet."
            },
            exclusions: [],
            lastIndexedAt: null,
            calibration: null
          }),
          { status: 200 }
        );
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    render(<App />);

    expect((await screen.findAllByText(/No local usage history detected/i)).length).toBeGreaterThan(0);
    expect(screen.getByText(/No readable local usage history was found at the current path yet/i)).toBeInTheDocument();
    expect(screen.getByText("No usage files were found in this directory yet.")).toBeInTheDocument();
    expect(screen.getByText("/home/dev/.codex")).toBeInTheDocument();
    expect(screen.getByText(/Prompt insights/i)).toBeInTheDocument();
  });

  it("shows a neutral read error when the current local path cannot be read", async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.startsWith("/api/overview")) {
        return new Response(
          JSON.stringify({
            tokenTotals: {
              totalTokens: 0,
              supportedTokens: 0,
              excludedTokens: 0,
              unestimatedTokens: 0
            },
            waterLitres: {
              low: 0,
              central: 0,
              high: 0
            },
            coverage: {
              supportedEvents: 0,
              excludedEvents: 0,
              tokenOnlyEvents: 0
            },
            diagnostics: {
              state: "read_error",
              codexHome: "/bad/path/.codex",
              message: "Configured Codex home does not exist."
            },
            exclusions: [],
            lastIndexedAt: null,
            calibration: null
          }),
          { status: 200 }
        );
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    render(<App />);

    expect((await screen.findAllByText(/Could not read local usage data/i)).length).toBeGreaterThan(0);
    expect(screen.getByText(/The dashboard could not read the current local usage path/i)).toBeInTheDocument();
    expect(screen.getByText("Configured data path does not exist.")).toBeInTheDocument();
  });
});
