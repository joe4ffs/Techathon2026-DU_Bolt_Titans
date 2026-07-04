import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useDeviceSocket } from "./useDeviceSocket.js";

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static reset() {
    FakeWebSocket.instances = [];
  }

  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readyState = 0;
  url: string;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send() {
    // no-op, the dashboard is read-only over this socket
  }

  close() {
    this.readyState = 3;
    this.onclose?.();
  }

  // --- test helpers, not part of the real WebSocket API ---
  triggerOpen() {
    this.readyState = 1;
    this.onopen?.();
  }

  triggerMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

const sampleSnapshot = {
  type: "snapshot",
  devices: [{ id: "drawing-fan-1" }],
  usage: { totalWattsNow: 0, perRoomWatts: {}, estimatedKwhToday: 0 },
  alerts: [],
};

describe("useDeviceSocket", () => {
  beforeEach(() => {
    FakeWebSocket.reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts in 'connecting' status", () => {
    const { result } = renderHook(() =>
      useDeviceSocket({
        url: "ws://test",
        WebSocketImpl: FakeWebSocket as unknown as typeof WebSocket,
      })
    );
    expect(result.current.status).toBe("connecting");
  });

  it("moves to 'open' once the socket connects", async () => {
    const { result } = renderHook(() =>
      useDeviceSocket({
        url: "ws://test",
        WebSocketImpl: FakeWebSocket as unknown as typeof WebSocket,
      })
    );

    act(() => {
      FakeWebSocket.instances[0].triggerOpen();
    });

    await waitFor(() => expect(result.current.status).toBe("open"));
  });

  it("populates devices/usage/alerts from a snapshot message", async () => {
    const { result } = renderHook(() =>
      useDeviceSocket({
        url: "ws://test",
        WebSocketImpl: FakeWebSocket as unknown as typeof WebSocket,
      })
    );

    act(() => {
      FakeWebSocket.instances[0].triggerMessage(sampleSnapshot);
    });

    await waitFor(() => expect(result.current.devices).toHaveLength(1));
    expect(result.current.usage?.totalWattsNow).toBe(0);
  });

  it("replaces state entirely on a subsequent update message", async () => {
    const { result } = renderHook(() =>
      useDeviceSocket({
        url: "ws://test",
        WebSocketImpl: FakeWebSocket as unknown as typeof WebSocket,
      })
    );
    const socket = FakeWebSocket.instances[0];

    act(() => socket.triggerMessage(sampleSnapshot));
    await waitFor(() => expect(result.current.devices).toHaveLength(1));

    act(() =>
      socket.triggerMessage({
        ...sampleSnapshot,
        type: "update",
        devices: [{ id: "a" }, { id: "b" }],
        usage: { totalWattsNow: 60, perRoomWatts: {}, estimatedKwhToday: 0.1 },
      })
    );

    await waitFor(() => expect(result.current.devices).toHaveLength(2));
    expect(result.current.usage?.totalWattsNow).toBe(60);
  });

  it("moves to 'closed' when the socket closes", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useDeviceSocket({
        url: "ws://test",
        WebSocketImpl: FakeWebSocket as unknown as typeof WebSocket,
        reconnectDelayMs: 5000,
      })
    );

    act(() => {
      FakeWebSocket.instances[0].close();
    });

    expect(result.current.status).toBe("closed");
  });

  it("automatically reconnects after the configured delay", () => {
    vi.useFakeTimers();
    renderHook(() =>
      useDeviceSocket({
        url: "ws://test",
        WebSocketImpl: FakeWebSocket as unknown as typeof WebSocket,
        reconnectDelayMs: 2000,
      })
    );

    expect(FakeWebSocket.instances).toHaveLength(1);

    act(() => {
      FakeWebSocket.instances[0].close();
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it("does not reconnect after the component unmounts", () => {
    vi.useFakeTimers();
    const { unmount } = renderHook(() =>
      useDeviceSocket({
        url: "ws://test",
        WebSocketImpl: FakeWebSocket as unknown as typeof WebSocket,
        reconnectDelayMs: 2000,
      })
    );

    act(() => {
      FakeWebSocket.instances[0].close();
    });
    unmount();
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("ignores a malformed (non-JSON) message instead of crashing", async () => {
    const { result } = renderHook(() =>
      useDeviceSocket({
        url: "ws://test",
        WebSocketImpl: FakeWebSocket as unknown as typeof WebSocket,
      })
    );
    const socket = FakeWebSocket.instances[0];

    act(() => {
      socket.onmessage?.({ data: "not valid json {{{" });
    });

    // state should remain at its initial values, no throw
    expect(result.current.devices).toEqual([]);
  });
});
