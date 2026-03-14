import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { WaterScaleChart } from "../src/components/WaterScaleChart";

afterEach(() => {
  cleanup();
});

describe("WaterScaleChart", () => {
  const waterLitres = {
    low: 0.5,
    central: 1.2,
    high: 2.1
  };

  it("shows a tooltip for a hovered comparison point with exact litres and description", () => {
    render(<WaterScaleChart waterLitres={waterLitres} />);

    fireEvent.mouseEnter(screen.getByTestId("water-scale-hit-cup-of-water"));

    const tooltip = screen.getByTestId("water-scale-tooltip");
    expect(tooltip).toHaveTextContent("A cup of water");
    expect(tooltip).toHaveTextContent("240.0 mL");
    expect(tooltip).toHaveTextContent("Direct Intake");
    expect(tooltip).toHaveTextContent("The volume of one metric cup of drinking water.");
    expect(tooltip).toHaveTextContent("Uses NIST's 1 cup = 240 mL conversion.");
  });

  it("hides the tooltip when the pointer leaves a comparison point", () => {
    render(<WaterScaleChart waterLitres={waterLitres} />);

    const point = screen.getByTestId("water-scale-hit-cup-of-water");
    fireEvent.mouseEnter(point);

    expect(screen.getByTestId("water-scale-tooltip")).toBeInTheDocument();

    fireEvent.mouseLeave(point);

    expect(screen.queryByTestId("water-scale-tooltip")).not.toBeInTheDocument();
  });

  it("shows the AI range tooltip when the AI marker is focused", () => {
    render(<WaterScaleChart waterLitres={waterLitres} />);

    fireEvent.focus(screen.getByTestId("water-scale-hit-ai"));

    const tooltip = screen.getByTestId("water-scale-tooltip");
    expect(tooltip).toHaveTextContent("Your AI usage");
    expect(tooltip).toHaveTextContent("1.20 L");
    expect(tooltip).toHaveTextContent("Between 500.0 mL and 2.10 L");
    expect(screen.queryByTestId("water-scale-range")).not.toBeInTheDocument();
  });

  it("positions the AI marker label above-left of the dot", () => {
    render(<WaterScaleChart waterLitres={waterLitres} />);

    const markerGroup = screen.getByTestId("water-scale-ai-marker");
    const markerDot = markerGroup.querySelector('circle[r="7"]');
    const markerLabel = screen.getByTestId("water-scale-ai-label");

    expect(markerDot).not.toBeNull();
    expect(markerLabel).toHaveAttribute("text-anchor", "end");
    expect(Number(markerLabel.getAttribute("x"))).toBeLessThan(Number(markerDot?.getAttribute("cx")));
    expect(Number(markerLabel.getAttribute("y"))).toBeLessThan(Number(markerDot?.getAttribute("cy")));
  });

  it("supports keyboard focus for fixed comparison points", () => {
    render(<WaterScaleChart waterLitres={waterLitres} />);

    fireEvent.focus(screen.getByTestId("water-scale-hit-manufacturing-a-car"));

    const tooltip = screen.getByTestId("water-scale-tooltip");
    expect(tooltip).toHaveTextContent("A car");
    expect(tooltip).toHaveTextContent("67,500 L");
    expect(tooltip).toHaveTextContent(/more than 95% occurs in the production phase/i);
  });

  it("keeps the rightmost comparison label centered on its anchor", () => {
    render(<WaterScaleChart waterLitres={waterLitres} />);

    const rightmostAnchor = screen.getByTestId("water-scale-anchor-golf-course-daily");
    const label = rightmostAnchor.querySelector("text");
    const markerDot = rightmostAnchor.querySelector('circle[r="6"]');

    expect(label).not.toBeNull();
    expect(markerDot).not.toBeNull();
    expect(label).toHaveAttribute("text-anchor", "middle");
    expect(Number(label?.getAttribute("x"))).toBe(Number(markerDot?.getAttribute("cx")));
  });

  it("renders a mobile legend and no horizontal-scroll layout classes", () => {
    render(<WaterScaleChart waterLitres={waterLitres} />);

    expect(screen.getByTestId("water-scale-mobile-legend")).toHaveTextContent("A cup of water");
    expect(screen.getByTestId("water-scale-mobile-legend")).not.toHaveTextContent("67.5 KL");
    expect(screen.getByTestId("water-scale-scroll")).not.toHaveClass("overflow-x-auto");
    expect(screen.getByTestId("water-scale-canvas")).not.toHaveClass("min-w-[56rem]");
  });
});
