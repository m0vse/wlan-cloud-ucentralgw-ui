export const trafficRate = (bytes: number, seconds: number): number | null =>
  Number.isFinite(bytes) && bytes >= 0 && Number.isFinite(seconds) && seconds > 0
    ? (bytes * 8) / seconds : null;
export const rateScale = (maximum: number) =>
  maximum >= 1e9 ? { factor: 1e9, unit: 'Gbit/s' } : { factor: 1e6, unit: 'Mbit/s' };
