import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PowerMeter } from "./PowerMeter.js";

describe("PowerMeter", () => {
  it("renders 0 W when usage is null", () => {
    render(<PowerMeter usage={null} />);
    expect(screen.getByTestId("total-watts")).toHaveTextContent("0");
  });

  it("renders the correct total wattage", () => {
    render(
      <PowerMeter
        usage={{
          totalWattsNow: 495,
          perRoomWatts: { drawing: 165, work1: 165, work2: 165 },
          estimatedKwhToday: 1.23,
        }}
      />
    );
    expect(screen.getByTestId("total-watts")).toHaveTextContent("495");
  });

  it("renders kWh formatted to 2 decimal places", () => {
    render(
      <PowerMeter
        usage={{
          totalWattsNow: 100,
          perRoomWatts: { drawing: 100, work1: 0, work2: 0 },
          estimatedKwhToday: 1.2345,
        }}
      />
    );
    expect(screen.getByTestId("kwh-today")).toHaveTextContent("1.23");
  });

  it("renders correct per-room wattage values", () => {
    render(
      <PowerMeter
        usage={{
          totalWattsNow: 90,
          perRoomWatts: { drawing: 60, work1: 30, work2: 0 },
          estimatedKwhToday: 0,
        }}
      />
    );
    expect(screen.getByTestId("room-watts-drawing")).toHaveTextContent(
      "60 W"
    );
    expect(screen.getByTestId("room-watts-work1")).toHaveTextContent("30 W");
    expect(screen.getByTestId("room-watts-work2")).toHaveTextContent("0 W");
  });

  it("does not render NaN or throw when total wattage is 0", () => {
    render(
      <PowerMeter
        usage={{
          totalWattsNow: 0,
          perRoomWatts: { drawing: 0, work1: 0, work2: 0 },
          estimatedKwhToday: 0,
        }}
      />
    );
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });
});
