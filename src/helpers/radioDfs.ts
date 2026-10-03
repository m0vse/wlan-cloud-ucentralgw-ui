type HealthSample = { recorded: number; UUID?: string; values: Record<string, unknown> };

// Match health to the displayed statistics sample, never infer CAC from channel or zero power.
export const radioInDfs = (
  phy: string,
  recorded: number,
  checks: HealthSample[] = [],
  uuid?: string,
) => {
  const health = checks
    .filter((check) => check.recorded <= recorded && (!uuid || !check.UUID || check.UUID === uuid))
    .sort((a, b) => b.recorded - a.recorded)[0];
  if (!health || recorded - health.recorded > 180) return false;
  const values = health.values as { dfs_cac?: Record<string, Record<string, { phy?: string; remaining?: number }>> };
  return Object.values(values.dfs_cac ?? {}).some((ssids) =>
    Object.values(ssids).some((cac) =>
      cac.phy === phy && typeof cac.remaining === 'number' && cac.remaining > recorded - health.recorded,
    ),
  );
};
