import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AlertsPanel } from "./AlertsPanel.js";
import type { Alert } from "@office-monitor/shared-types";

const sampleAlert: Alert = {
  id: "after-hours:drawing-light-1",
  type: "after-hours",
  message: "Light 1 in Drawing Room was left ON after office hours.",
  room: "drawing",
  deviceId: "drawing-light-1",
  triggeredAt: "2026-01-01T20:15:00.000Z",
};

describe("AlertsPanel", () => {
  it("renders an empty state when there are no alerts", () => {
    render(<AlertsPanel alerts={[]} />);
    expect(screen.getByTestId("alerts-empty")).toBeInTheDocument();
  });

  it("renders one row per alert", () => {
    render(<AlertsPanel alerts={[sampleAlert]} />);
    expect(screen.getByTestId(`alert-${sampleAlert.id}`)).toBeInTheDocument();
  });

  it("renders the alert's message text", () => {
    render(<AlertsPanel alerts={[sampleAlert]} />);
    expect(screen.getByText(sampleAlert.message)).toBeInTheDocument();
  });

  it("renders a human-formatted time, not the raw ISO string", () => {
    render(<AlertsPanel alerts={[sampleAlert]} />);
    const row = screen.getByTestId(`alert-${sampleAlert.id}`);
    expect(row.textContent).not.toContain("2026-01-01T20:15:00.000Z");
  });

  it("renders multiple alerts as distinct rows", () => {
    const second: Alert = {
      ...sampleAlert,
      id: "room-continuous-on:work1",
      room: "work1",
      message:
        "Work Room 1 has had all devices ON continuously for over 2 hours.",
    };
    render(<AlertsPanel alerts={[sampleAlert, second]} />);
    expect(screen.getByTestId(`alert-${sampleAlert.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`alert-${second.id}`)).toBeInTheDocument();
  });
});
