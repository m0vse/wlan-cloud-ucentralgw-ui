export type Neighbour = { bssid: string; ssid: string; frequency: number; channel: number; signal: number };
export const normalizeNeighbours = (scan: unknown): Neighbour[] => {
  if (!Array.isArray(scan)) return [];
  const best = new Map<string, Neighbour>();
  for (const row of scan) {
    if (!row || typeof row.bssid !== 'string' || !/^(?:[a-f0-9]{2}:){5}[a-f0-9]{2}$/i.test(row.bssid)) continue;
    const frequency = Number(row.frequency);
    const channel = Number(row.channel);
    const signal = typeof row.signal === 'number' ? row.signal : Number.parseFloat(row.signal);
    if (!Number.isFinite(signal) || signal >= 0 || signal < -150 || !Number.isFinite(frequency) || frequency <= 0 || !Number.isFinite(channel) || channel <= 0) continue;
    const bssid = row.bssid.toLowerCase();
    const key = `${bssid}:${frequency}`;
    if (!best.has(key) || best.get(key)!.signal < signal) best.set(key, {
      bssid, frequency, channel, signal,
      ssid: typeof row.ssid === 'string' && row.ssid ? row.ssid : typeof row.meshid === 'string' && row.meshid ? row.meshid : '(hidden)',
    });
  }
  return [...best.values()].sort((a, b) => b.signal - a.signal || a.bssid.localeCompare(b.bssid));
};
export const neighbourBand = (frequency: number): string => frequency < 3000 ? '2.4 GHz' : frequency >= 5955 ? '6 GHz' : '5 GHz';
