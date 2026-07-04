import { useDeviceSocket } from "./hooks/useDeviceSocket.js";
import { OfficeFloorPlan } from "./components/OfficeFloorPlan.js";
import { DeviceStatusPanel } from "./components/DeviceStatusPanel.js";
import { PowerMeter } from "./components/PowerMeter.js";
import { AlertsPanel } from "./components/AlertsPanel.js";
import styles from "./App.module.css";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:3001/ws";

export default function App() {
  const { devices, usage, alerts, status } = useDeviceSocket({ url: WS_URL });
  const hasData = devices.length > 0;

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Office Monitor</h1>
        <span className={styles.status} data-status={status}>
          <span className={styles.statusDot} aria-hidden="true" />
          {status === "open" ? "LIVE" : status.toUpperCase()}
        </span>
      </header>

      {hasData ? (
        <>
          <div className={styles.floorPlanRow}>
            <OfficeFloorPlan devices={devices} />
          </div>

          <main className={styles.main}>
            <DeviceStatusPanel devices={devices} />
            <div className={styles.sideColumn}>
              <PowerMeter usage={usage} />
              <AlertsPanel alerts={alerts} />
            </div>
          </main>
        </>
      ) : (
        <div className={styles.loading} role="status">
          {status === "closed"
            ? "Can't reach the backend — retrying…"
            : "Connecting to backend…"}
        </div>
      )}
    </div>
  );
}
