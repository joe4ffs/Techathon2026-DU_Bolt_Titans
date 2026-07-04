import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { DeviceStatusPanel } from "./DeviceStatusPanel.js";
import { createInitialDevices } from "@office-monitor/shared-types";
import type { Device } from "@office-monitor/shared-types";

function withOn(ids: string[]): Device[] {
  return createInitialDevices("2026-01-01T00:00:00.000Z").map((d) =>
    ids.includes(d.id) ? { ...d, status: "on" as const } : d
  );
}

describe("DeviceStatusPanel", () => {
  it("renders all 3 room labels", () => {
    render(<DeviceStatusPanel devices={createInitialDevices()} />);
    expect(screen.getByText("Drawing Room")).toBeInTheDocument();
    expect(screen.getByText("Work Room 1")).toBeInTheDocument();
    expect(screen.getByText("Work Room 2")).toBeInTheDocument();
  });

  it("renders exactly 5 devices in each room", () => {
    render(<DeviceStatusPanel devices={createInitialDevices()} />);
    for (const room of ["drawing", "work1", "work2"]) {
      const roomBox = screen.getByTestId(`room-${room}`);
      const deviceLabels = within(roomBox).getAllByText(/^(Fan|Light) \d$/);
      expect(deviceLabels).toHaveLength(5);
    }
  });

  it("renders device labels like 'Fan 1' and 'Light 3'", () => {
    render(<DeviceStatusPanel devices={createInitialDevices()} />);
    expect(screen.getAllByText("Fan 1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Light 3").length).toBeGreaterThan(0);
  });

  it("marks an ON device with data-status='on'", () => {
    render(<DeviceStatusPanel devices={withOn(["drawing-fan-1"])} />);
    expect(screen.getByTestId("device-drawing-fan-1")).toHaveAttribute(
      "data-status",
      "on"
    );
  });

  it("marks an OFF device with data-status='off'", () => {
    render(<DeviceStatusPanel devices={withOn([])} />);
    expect(screen.getByTestId("device-drawing-fan-1")).toHaveAttribute(
      "data-status",
      "off"
    );
  });

  it("re-renders correctly when the devices prop changes", () => {
    const { rerender } = render(<DeviceStatusPanel devices={withOn([])} />);
    expect(screen.getByTestId("device-work1-light-1")).toHaveAttribute(
      "data-status",
      "off"
    );

    rerender(<DeviceStatusPanel devices={withOn(["work1-light-1"])} />);
    expect(screen.getByTestId("device-work1-light-1")).toHaveAttribute(
      "data-status",
      "on"
    );
  });

  it("renders all 15 devices total across all rooms", () => {
    render(<DeviceStatusPanel devices={createInitialDevices()} />);
    const stateLabels = screen.getAllByText(/^(ON|OFF)$/);
    expect(stateLabels).toHaveLength(15);
  });
});
