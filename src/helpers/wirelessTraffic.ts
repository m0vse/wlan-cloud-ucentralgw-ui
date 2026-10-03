import type { DeviceStatistics } from 'hooks/Network/Statistics';
import { operatingBand } from './operatingBand';

type Counter = { tx_bytes: number; rx_bytes: number; tx_packets: number; rx_packets: number };
type Reading = { counters: Counter; label: string; radio: string; radioLabel: string };
export type TrafficSeries = {
  tx: number[]; rx: number[]; packetsTx: number[]; packetsRx: number[];
  recorded: number[]; intervals: number[];
  maxTx: number; maxRx: number; maxPacketsTx: number; maxPacketsRx: number;
};

// Each BSSID is counted once. Radio totals contain only its BSS traffic,
// never interface/uplink counters or association counters for the same frames.
export const wirelessReadings = (state: DeviceStatistics): Record<string, Reading> => {
  const readings: Record<string, Reading> = {};
  for (const iface of state.interfaces ?? []) for (const ssid of iface.ssids ?? []) {
    if (!ssid.counters || !ssid.bssid || !ssid.phy) continue;
    const key = `ssid:${ssid.bssid.toLowerCase()}`;
    if (readings[key]) continue;
    const radio = state.radios?.find((r) => r.phy === ssid.phy);
    const band = radio ? operatingBand(radio) : '-';
    readings[key] = {
      counters: ssid.counters,
      label: `SSID: ${ssid.ssid} (${band}, ${ssid.iface})`,
      radio: `radio:${ssid.phy}`,
      radioLabel: `Radio: ${band} (${ssid.iface.replace(/-\d+$/, '')})`,
    };
  }
  return readings;
};

export const wirelessTraffic = (samples: { recorded: number; data: DeviceStatistics }[]) => {
  const series: Record<string, TrafficSeries> = {};
  const labels: Record<string, string> = {};
  let previous: Record<string, Reading> = {};
  let previousTime: number | undefined;
  const append = (key: string, values: Counter, recorded: number, seconds: number) => {
    const item = series[key] ??= { tx: [], rx: [], packetsTx: [], packetsRx: [], recorded: [], intervals: [],
      maxTx: 0, maxRx: 0, maxPacketsTx: 0, maxPacketsRx: 0 };
    item.tx.push(values.tx_bytes); item.rx.push(values.rx_bytes);
    item.packetsTx.push(values.tx_packets); item.packetsRx.push(values.rx_packets);
    item.recorded.push(recorded); item.intervals.push(seconds);
    if (Number.isFinite(values.tx_bytes)) item.maxTx = Math.max(item.maxTx, values.tx_bytes);
    if (Number.isFinite(values.rx_bytes)) item.maxRx = Math.max(item.maxRx, values.rx_bytes);
    if (Number.isFinite(values.tx_packets)) item.maxPacketsTx = Math.max(item.maxPacketsTx, values.tx_packets);
    if (Number.isFinite(values.rx_packets)) item.maxPacketsRx = Math.max(item.maxPacketsRx, values.rx_packets);
  };
  for (const sample of [...samples].sort((a, b) => a.recorded - b.recorded)) {
    const current = wirelessReadings(sample.data);
    const seconds = previousTime === undefined ? 0 : sample.recorded - previousTime;
    const totals: Record<string, Counter> = {};
    for (const [key, reading] of Object.entries(current)) {
      labels[key] = reading.label; labels[reading.radio] = reading.radioLabel;
      if (previousTime === undefined) continue;
      const old = previous[key];
      const delta = { tx_bytes: NaN, rx_bytes: NaN, tx_packets: NaN, rx_packets: NaN };
      for (const field of Object.keys(delta) as (keyof Counter)[]) {
        const value = reading.counters[field];
        const baseline = old?.counters[field];
        if (old?.radio === reading.radio && seconds > 0 && Number.isFinite(value) &&
          Number.isFinite(baseline) && value >= baseline) delta[field] = value - baseline;
      }
      append(key, delta, sample.recorded, seconds);
      const total = totals[reading.radio] ??= { tx_bytes: 0, rx_bytes: 0, tx_packets: 0, rx_packets: 0 };
      for (const field of Object.keys(delta) as (keyof Counter)[]) total[field] += delta[field];
    }
    // Missing BSS measurements must produce a gap rather than stale traffic.
    for (const [key, reading] of Object.entries(previous)) if (!current[key]) {
      const missing = { tx_bytes: NaN, rx_bytes: NaN, tx_packets: NaN, rx_packets: NaN };
      append(key, missing, sample.recorded, seconds);
      totals[reading.radio] = missing;
    }
    for (const [key, values] of Object.entries(totals)) append(key, values, sample.recorded, seconds);
    previous = current; previousTime = sample.recorded;
  }
  return { series, labels };
};
