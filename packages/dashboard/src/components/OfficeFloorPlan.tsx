import type { Device, RoomId } from "@office-monitor/shared-types";
import { ROOM_LABELS } from "@office-monitor/shared-types";
import styles from "./OfficeFloorPlan.module.css";

export interface OfficeFloorPlanProps {
  devices: Device[];
}

interface RoomConfig {
  room: RoomId;
  x: number;
  kind: "lounge" | "work";
}

const ROOM_WIDTH = 260;
const ROOM_HEIGHT = 380;
const ROOM_GAP = 20;
const ROOM_Y = 20;

const ROOMS: RoomConfig[] = [
  { room: "drawing", x: 20, kind: "lounge" },
  { room: "work1", x: 20 + ROOM_WIDTH + ROOM_GAP, kind: "work" },
  { room: "work2", x: 20 + (ROOM_WIDTH + ROOM_GAP) * 2, kind: "work" },
];

const VIEWBOX_WIDTH = ROOMS[2].x + ROOM_WIDTH + 20;
const VIEWBOX_HEIGHT = ROOM_Y + ROOM_HEIGHT + 20;

// Local (room-relative) ceiling-fixture positions, shared by every room.
const FAN_POSITIONS = [
  { x: 75, y: 65 },
  { x: 185, y: 65 },
];
const LIGHT_POSITIONS = [
  { x: 50, y: 130 },
  { x: 130, y: 130 },
  { x: 210, y: 130 },
];

export function OfficeFloorPlan({ devices }: OfficeFloorPlanProps) {
  return (
    <section
      className={styles.panel}
      aria-label="Live top-down office floor plan"
    >
      <h2 className={styles.heading}>Office Floor Plan</h2>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        role="img"
        aria-label="Top-down live floor plan showing fan and light status in each room"
      >
        {ROOMS.map((config) => (
          <RoomGroup key={config.room} config={config} devices={devices} />
        ))}
      </svg>
    </section>
  );
}

function RoomGroup({
  config,
  devices,
}: {
  config: RoomConfig;
  devices: Device[];
}) {
  const { room, x, kind } = config;

  return (
    <g transform={`translate(${x}, ${ROOM_Y})`}>
      <rect
        className={styles.roomOutline}
        x={0}
        y={0}
        width={ROOM_WIDTH}
        height={ROOM_HEIGHT}
      />
      <text
        className={styles.roomLabel}
        x={ROOM_WIDTH / 2}
        y={22}
        textAnchor="middle"
      >
        {ROOM_LABELS[room].toUpperCase()}
      </text>

      {kind === "lounge" ? <LoungeFurniture /> : <WorkFurniture />}

      {FAN_POSITIONS.map((pos, i) => {
        const id = `${room}-fan-${i + 1}`;
        const device = devices.find((d) => d.id === id);
        return (
          <FanIcon
            key={id}
            id={id}
            x={pos.x}
            y={pos.y}
            on={device?.status === "on"}
            label={device?.label ?? `Fan ${i + 1}`}
          />
        );
      })}

      {LIGHT_POSITIONS.map((pos, i) => {
        const id = `${room}-light-${i + 1}`;
        const device = devices.find((d) => d.id === id);
        return (
          <LightIcon
            key={id}
            id={id}
            x={pos.x}
            y={pos.y}
            on={device?.status === "on"}
            label={device?.label ?? `Light ${i + 1}`}
          />
        );
      })}
    </g>
  );
}

function FanIcon({
  id,
  x,
  y,
  on,
  label,
}: {
  id: string;
  x: number;
  y: number;
  on: boolean;
  label: string;
}) {
  return (
    <g
      transform={`translate(${x}, ${y})`}
      data-testid={`floorplan-${id}`}
      data-status={on ? "on" : "off"}
    >
      <title>{`${label}: ${on ? "ON" : "OFF"}`}</title>
      <circle className={styles.fanHousing} r={16} />
      <g className={on ? `${styles.fanBlades} ${styles.spinning}` : styles.fanBlades}>
        <line x1={0} y1={-14} x2={0} y2={14} />
        <line x1={-12} y1={7} x2={12} y2={7} />
        <line x1={-12} y1={-7} x2={12} y2={-7} />
      </g>
    </g>
  );
}

function LightIcon({
  id,
  x,
  y,
  on,
  label,
}: {
  id: string;
  x: number;
  y: number;
  on: boolean;
  label: string;
}) {
  return (
    <g
      transform={`translate(${x}, ${y})`}
      data-testid={`floorplan-${id}`}
      data-status={on ? "on" : "off"}
    >
      <title>{`${label}: ${on ? "ON" : "OFF"}`}</title>
      <circle className={on ? `${styles.bulb} ${styles.bulbOn}` : styles.bulb} r={10} />
    </g>
  );
}

function LoungeFurniture() {
  return (
    <g className={styles.furniture} aria-hidden="true">
      <rect x={20} y={260} width={100} height={50} rx={6} />
      <rect x={150} y={270} width={60} height={40} rx={2} />
      <circle cx={230} cy={200} r={8} />
    </g>
  );
}

function WorkFurniture() {
  return (
    <g className={styles.furniture} aria-hidden="true">
      <rect x={30} y={220} width={70} height={40} />
      <rect x={50} y={270} width={30} height={25} />
      <rect x={160} y={220} width={70} height={40} />
      <rect x={180} y={270} width={30} height={25} />
    </g>
  );
}
