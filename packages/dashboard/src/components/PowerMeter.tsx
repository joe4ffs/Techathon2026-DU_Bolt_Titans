import type { UsageSnapshot } from "@office-monitor/shared-types";
import { ROOM_IDS, ROOM_LABELS } from "@office-monitor/shared-types";
import styles from "./PowerMeter.module.css";

export interface PowerMeterProps {
  usage: UsageSnapshot | null;
}

export function PowerMeter({ usage }: PowerMeterProps) {
  const total = usage?.totalWattsNow ?? 0;
  const kwh = usage?.estimatedKwhToday ?? 0;

  return (
    <section className={styles.panel} aria-label="Power consumption meter">
      <h2 className={styles.heading}>Power Meter</h2>
      <div className={styles.readout}>
        <span className={styles.totalValue} data-testid="total-watts">
          {total}
        </span>
        <span className={styles.unit}>W</span>
      </div>
      <div className={styles.kwh} data-testid="kwh-today">
        {kwh.toFixed(2)} kWh today (est.)
      </div>
      <div className={styles.roomBreakdown}>
        {ROOM_IDS.map((room) => {
          const watts = usage?.perRoomWatts[room] ?? 0;
          const pct = total > 0 ? Math.round((watts / total) * 100) : 0;
          return (
            <div
              key={room}
              className={styles.roomRow}
              data-testid={`room-watts-${room}`}
            >
              <span className={styles.roomName}>{ROOM_LABELS[room]}</span>
              <div className={styles.bar}>
                <div className={styles.barFill} style={{ width: `${pct}%` }} />
              </div>
              <span className={styles.roomValue}>{watts} W</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
