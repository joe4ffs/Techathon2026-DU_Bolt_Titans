import type { Device, RoomId } from "@office-monitor/shared-types";
import { ROOM_IDS, ROOM_LABELS } from "@office-monitor/shared-types";
import styles from "./DeviceStatusPanel.module.css";

export interface DeviceStatusPanelProps {
  devices: Device[];
}

export function DeviceStatusPanel({ devices }: DeviceStatusPanelProps) {
  return (
    <section className={styles.panel} aria-label="Device status by room">
      <h2 className={styles.heading}>Device Status</h2>
      <div className={styles.rooms}>
        {ROOM_IDS.map((room) => (
          <RoomBreaker
            key={room}
            room={room}
            devices={devices.filter((d) => d.room === room)}
          />
        ))}
      </div>
    </section>
  );
}

function RoomBreaker({
  room,
  devices,
}: {
  room: RoomId;
  devices: Device[];
}) {
  return (
    <div className={styles.roomBox} data-testid={`room-${room}`}>
      <div className={styles.roomLabel}>{ROOM_LABELS[room]}</div>
      <div className={styles.switchGrid}>
        {devices.map((device) => (
          <div
            key={device.id}
            className={styles.switchRow}
            data-testid={`device-${device.id}`}
            data-status={device.status}
          >
            <span
              className={`${styles.led} ${
                device.status === "on" ? styles.ledOn : ""
              }`}
              aria-hidden="true"
            />
            <span className={styles.deviceLabel}>{device.label}</span>
            <span className={styles.stateText}>
              {device.status.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
