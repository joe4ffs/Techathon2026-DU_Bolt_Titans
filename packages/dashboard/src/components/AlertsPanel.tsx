import type { Alert } from "@office-monitor/shared-types";
import styles from "./AlertsPanel.module.css";

export interface AlertsPanelProps {
  alerts: Alert[];
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  return (
    <section className={styles.panel} aria-label="Active alerts">
      <h2 className={styles.heading}>Alerts</h2>
      {alerts.length === 0 ? (
        <div className={styles.empty} data-testid="alerts-empty">
          No active alerts. Everything's within normal parameters.
        </div>
      ) : (
        <ul className={styles.list} data-testid="alerts-list">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className={styles.alertRow}
              data-testid={`alert-${alert.id}`}
            >
              <span className={styles.alertTime}>
                {formatTime(alert.triggeredAt)}
              </span>
              <span className={styles.alertMessage}>{alert.message}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
