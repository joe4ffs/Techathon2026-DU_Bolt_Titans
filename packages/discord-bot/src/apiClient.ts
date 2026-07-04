import type {
  Alert,
  Device,
  RoomId,
  UsageSnapshot,
} from "@office-monitor/shared-types";

export interface DeviceApi {
  getDevices(): Promise<Device[]>;
  getRoom(room: RoomId): Promise<Device[]>;
  getUsage(): Promise<UsageSnapshot>;
  getAlerts(): Promise<Alert[]>;
}

export interface ApiClientOptions {
  baseUrl: string;
  /** Injectable fetch, so tests never touch a real network. */
  fetchImpl?: typeof fetch;
}

/**
 * REST client hitting the same backend the dashboard uses — this is what
 * makes "one source of truth" apply to the bot too, not just the dashboard.
 */
export class ApiClient implements DeviceApi {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  getDevices(): Promise<Device[]> {
    return this.getJson<Device[]>("/api/devices");
  }

  getRoom(room: RoomId): Promise<Device[]> {
    return this.getJson<Device[]>(`/api/rooms/${room}`);
  }

  getUsage(): Promise<UsageSnapshot> {
    return this.getJson<UsageSnapshot>("/api/usage");
  }

  getAlerts(): Promise<Alert[]> {
    return this.getJson<Alert[]>("/api/alerts");
  }

  private async getJson<T>(path: string): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`);
    if (!res.ok) {
      throw new Error(`Request to ${path} failed with status ${res.status}`);
    }
    return (await res.json()) as T;
  }
}
