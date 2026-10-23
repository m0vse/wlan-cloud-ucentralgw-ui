import type { DeviceStatistics } from 'hooks/Network/Statistics';
import type { TrafficSeries } from './wirelessTraffic';

const fields = ['rx_bytes', 'tx_bytes', 'rx_packets', 'tx_packets'] as const;
type Counters = Partial<Record<typeof fields[number], number>>;

// Physical upstream ports only. Logical bridge/network counters also include
// Wi-Fi forwarding and cannot represent the Ethernet upload/download direction.
export const upstreamTraffic = (samples: { recorded: number; data: DeviceStatistics }[]) => {
  const series: Record<string, TrafficSeries> = {};
  const labels: Record<string, string> = {};
  let previous: Record<string, Counters> = {};
  let previousTime: number | undefined;
  for (const sample of [...samples].sort((a, b) => a.recorded - b.recorded)) {
    const current: Record<string, Counters> = {};
    for (const [port, link] of Object.entries(sample.data['link-state']?.upstream ?? {})) {
      if (link.counters) current[port] = link.counters;
    }
    const seconds = previousTime === undefined ? 0 : sample.recorded - previousTime;
    for (const port of new Set([...Object.keys(previous), ...Object.keys(current)])) {
      const key = `upstream:${port}`;
      labels[key] = `Upstream (${port})`;
      const item = series[key] ??= { tx: [], rx: [], packetsTx: [], packetsRx: [], recorded: [], intervals: [],
        maxTx: 0, maxRx: 0, maxPacketsTx: 0, maxPacketsRx: 0 };
      if (previousTime === undefined) continue;
      const delta = {} as Record<typeof fields[number], number>;
      for (const field of fields) {
        const value = current[port]?.[field];
        const old = previous[port]?.[field];
        delta[field] = seconds > 0 && seconds <= 600 && typeof value === 'number' &&
          typeof old === 'number' && Number.isFinite(value) && Number.isFinite(old) && old >= 0 && value >= old
          ? value - old : NaN;
      }
      item.tx.push(delta.tx_bytes); item.rx.push(delta.rx_bytes);
      item.packetsTx.push(delta.tx_packets); item.packetsRx.push(delta.rx_packets);
      item.recorded.push(sample.recorded); item.intervals.push(seconds);
      if (Number.isFinite(delta.tx_bytes)) item.maxTx = Math.max(item.maxTx, delta.tx_bytes);
      if (Number.isFinite(delta.rx_bytes)) item.maxRx = Math.max(item.maxRx, delta.rx_bytes);
      if (Number.isFinite(delta.tx_packets)) item.maxPacketsTx = Math.max(item.maxPacketsTx, delta.tx_packets);
      if (Number.isFinite(delta.rx_packets)) item.maxPacketsRx = Math.max(item.maxPacketsRx, delta.rx_packets);
    }
    previous = current; previousTime = sample.recorded;
  }
  return { series, labels };
};
