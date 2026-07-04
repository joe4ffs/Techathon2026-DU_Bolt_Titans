import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OfficeFloorPlan } from "./OfficeFloorPlan.js";
import { createInitialDevices } from "@office-monitor/shared-types";
import type { Device } from "@office-monitor/shared-types";

function withOn(ids: string[]): Device[] {
  return createInitialDevices("2026-01-01T00:00:00.000Z").map((d) =>
    ids.includes(d.id) ? { ...d, status: "on" as const } : d
  );
}

describe("OfficeFloorPlan", () => {
  it("renders all 3 room labels", () => {
    render(<OfficeFloorPlan devices={createInitialDevices()} />);
    expect(screen.getByText("DRAWING ROOM")).toBeInTheDocument();
    expect(screen.getByText("WORK ROOM 1")).toBeInTheDocument();
    expect(screen.getByText("WORK ROOM 2")).toBeInTheDocument();
  });

  it("renders exactly 6 fan icons and 9 light icons across the whole plan", () => {
    render(<OfficeFloorPlan devices={createInitialDevices()} />);
    const fans = screen.getAllByTestId(/floorplan-.*-fan-/);
    const lights = screen.getAllByTestId(/floorplan-.*-light-/);
    expect(fans).toHaveLength(6);
    expect(lights).toHaveLength(9);
  });

  it("gives every fixture a unique testid across all 3 rooms (no collisions)", () => {
    render(<OfficeFloorPlan devices={createInitialDevices()} />);
    const all = [
      ...screen.getAllByTestId(/floorplan-.*-fan-/),
      ...screen.getAllByTestId(/floorplan-.*-light-/),
    ];
    const ids = all.map((el) => el.getAttribute("data-testid"));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("marks an ON fan with data-status='on'", () => {
    render(<OfficeFloorPlan devices={withOn(["work1-fan-1"])} />);
    expect(screen.getByTestId("floorplan-work1-fan-1")).toHaveAttribute(
      "data-status",
      "on"
    );
  });

  it("marks an OFF fan with data-status='off'", () => {
    render(<OfficeFloorPlan devices={withOn([])} />);
    expect(screen.getByTestId("floorplan-work1-fan-1")).toHaveAttribute(
      "data-status",
      "off"
    );
  });

  it("marks an ON light with data-status='on'", () => {
    render(<OfficeFloorPlan devices={withOn(["drawing-light-2"])} />);
    expect(screen.getByTestId("floorplan-drawing-light-2")).toHaveAttribute(
      "data-status",
      "on"
    );
  });

  it("re-renders correctly when the devices prop changes", () => {
    const { rerender } = render(<OfficeFloorPlan devices={withOn([])} />);
    expect(screen.getByTestId("floorplan-work2-fan-2")).toHaveAttribute(
      "data-status",
      "off"
    );

    rerender(<OfficeFloorPlan devices={withOn(["work2-fan-2"])} />);
    expect(screen.getByTestId("floorplan-work2-fan-2")).toHaveAttribute(
      "data-status",
      "on"
    );
  });

  it("renders fixtures with a sensible fallback label even if a device is missing from the array", () => {
    const incomplete = createInitialDevices().filter(
      (d) => d.id !== "drawing-fan-1"
    );
    render(<OfficeFloorPlan devices={incomplete} />);
    // Should still render the fixture (as OFF, via the fallback label) rather than crashing
    expect(screen.getByTestId("floorplan-drawing-fan-1")).toHaveAttribute(
      "data-status",
      "off"
    );
  });
});
