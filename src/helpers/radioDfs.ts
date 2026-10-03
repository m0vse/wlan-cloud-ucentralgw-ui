type HealthSample = { recorded: number; UUID?: string; values: Record<string, unknown> };
type Radio = { phy: string; frequency?: number[]; band?: string[]; phy_name?: string };

// Match health to the displayed statistics sample, never infer CAC from channel or zero power.
export const radioInDfs = (
  radio: Radio,
  recorded: number,
  checks: HealthSample[] = [],
  uuid?: string,
  radios: Radio[] = [],
) => {
  const health = checks
    .filter((check) => check.recorded <= recorded && (!uuid || !check.UUID || check.UUID === uuid))
    .sort((a, b) => b.recorded - a.recorded)[0];
  if (!health || recorded - health.recorded > 180) return false;
  const values = health.values as { dfs_cac?: Record<string, Record<string, { phy?: string; remaining?: number }>> };
  const active = Object.values(values.dfs_cac ?? {}).flatMap((ssids) => Object.values(ssids))
    .filter((cac) => typeof cac.remaining === 'number' && cac.remaining > recorded - health.recorded);
  if (active.some((cac) => cac.phy === radio.phy || (radio.phy_name && cac.phy === radio.phy_name))) return true;
  // Older firmware uses hardware paths in statistics and kernel names in health.
  // Resolve only the unambiguous single-operating-5-GHz case; never assume array order.
  const is5G = (item: Radio) => item.frequency?.some((freq) => freq >= 4900 && freq < 5925) ?? false;
  return active.length > 0 && is5G(radio) && radios.filter(is5G).length === 1;
};
