import { useEffect, useRef, useState } from "react";
import type {
  Alert,
  Device,
  UsageSnapshot,
} from "@office-monitor/shared-types";

export type ConnectionStatus = "connecting" | "open" | "closed";

export interface DeviceSocketState {
  devices: Device[];
  usage: UsageSnapshot | null;
  alerts: Alert[];
  status: ConnectionStatus;
}

interface IncomingMessage {
  type: "snapshot" | "update";
  devices: Device[];
  usage: UsageSnapshot;
  alerts: Alert[];
}

export interface UseDeviceSocketOptions {
  url: string;
  /** Injectable WebSocket constructor, so tests never touch a real network. */
  WebSocketImpl?: typeof WebSocket;
  reconnectDelayMs?: number;
}

const initialState: DeviceSocketState = {
  devices: [],
  usage: null,
  alerts: [],
  status: "connecting",
};

export function useDeviceSocket(
  options: UseDeviceSocketOptions
): DeviceSocketState {
  const { url, WebSocketImpl = WebSocket, reconnectDelayMs = 2000 } = options;
  const [state, setState] = useState<DeviceSocketState>(initialState);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    let socket: WebSocket;
    let cancelled = false;

    function connect() {
      setState((s) => ({ ...s, status: "connecting" }));
      socket = new WebSocketImpl(url);

      socket.onopen = () => {
        if (!cancelled) setState((s) => ({ ...s, status: "open" }));
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data as string) as IncomingMessage;
          setState((s) => ({
            ...s,
            devices: message.devices,
            usage: message.usage,
            alerts: message.alerts,
          }));
        } catch {
          // Ignore malformed messages rather than crashing the dashboard.
        }
      };

      socket.onclose = () => {
        if (cancelled) return;
        setState((s) => ({ ...s, status: "closed" }));
        reconnectTimer.current = setTimeout(connect, reconnectDelayMs);
      };

      socket.onerror = () => {
        socket.close();
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      socket?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, WebSocketImpl, reconnectDelayMs]);

  return state;
}
