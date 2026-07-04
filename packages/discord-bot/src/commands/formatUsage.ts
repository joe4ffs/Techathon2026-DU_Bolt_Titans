import type { UsageSnapshot } from "@office-monitor/shared-types";

/** e.g. "Total power right now: 740W. Today's estimated usage: 4.2 kWh." */
export function formatUsage(usage: UsageSnapshot): string {
  return `Total power right now: ${usage.totalWattsNow}W. Today's estimated usage: ${usage.estimatedKwhToday.toFixed(1)} kWh.`;
}
