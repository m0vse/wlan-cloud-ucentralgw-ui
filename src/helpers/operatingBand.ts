type RadioBandData = { frequency?: number[]; band?: string[] };

// band is a hardware capability list, not the selected operating band.
// Channel numbers overlap between 2.4, 5 and 6 GHz, so do not infer from channel.
export const operatingBand = (radio: RadioBandData): string => {
  const frequency = radio.frequency?.[0];
  if (typeof frequency === 'number' && Number.isFinite(frequency)) {
    if (frequency >= 5925 && frequency <= 7125) return '6G';
    if (frequency >= 4900 && frequency < 5925) return '5G';
    if (frequency >= 2400 && frequency <= 2500) return '2G';
    if (frequency >= 57000 && frequency <= 71000) return '60G';
  }
  const bands = [...new Set(radio.band ?? [])].filter(Boolean);
  return bands.length === 1 ? bands[0] : '-';
};
