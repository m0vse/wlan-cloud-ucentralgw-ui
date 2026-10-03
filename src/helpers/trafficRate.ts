export const trafficRate = (bytes: number, seconds: number): number | null =>
  Number.isFinite(bytes) && bytes >= 0 && Number.isFinite(seconds) && seconds > 0
    ? (bytes * 8) / seconds : null;
export const rateScale = (maximum: number) =>
  maximum >= 1e9 ? { factor: 1e9, unit: 'Gbit/s' } : { factor: 1e6, unit: 'Mbit/s' };

type Counters = { rx_bytes?: number; tx_bytes?: number; rx_packets?: number; tx_packets?: number };
export const interfaceCounters = (iface: { counters?: Counters; 'counters-aggregate'?: Counters }) => {
  // Interface totals already account for member ports, including Wi-Fi.
  // Never add SSID counters to them: it counts forwarded traffic again.
  const counters = iface['counters-aggregate'] ?? iface.counters;
  return {
    rx_bytes: counters?.rx_bytes ?? 0,
    tx_bytes: counters?.tx_bytes ?? 0,
    rx_packets: counters?.rx_packets ?? 0,
    tx_packets: counters?.tx_packets ?? 0,
  };
};
