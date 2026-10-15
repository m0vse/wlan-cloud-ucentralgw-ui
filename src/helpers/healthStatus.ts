import { parseDiagnostic } from './diagnosticReport';

export type HealthPresentation = { color: 'red' | 'orange' | 'yellow' | 'green' | 'gray'; label: string; critical: boolean };

// The percentage is an independent AP score, not proof that no fault exists.
export const healthPresentation = (sanity: unknown, input: unknown, unavailable = false): HealthPresentation => {
  const value = parseDiagnostic(input);
  const payload = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
  const hasFaults = payload != null && Object.prototype.hasOwnProperty.call(payload, 'faults');
  const rawFaults = payload?.faults;
  const faults = rawFaults && typeof rawFaults === 'object' && !Array.isArray(rawFaults)
    ? rawFaults as { active?: unknown; stale?: boolean } : undefined;
  const active = Array.isArray(faults?.active) ? faults.active : [];
  // Compatibility for existing firmware: only downgrade with explicit,
  // resource-matched proof that channel and width are healthy. Raw reports
  // remain unchanged, and unrelated or incomplete critical faults stay red.
  const powerOnly = (fault: any): boolean => {
    if (!fault || fault.code !== 'radio_operating_mismatch' || faults?.stale) return false;
    const reports = payload?.radio_operating as Record<string, any> | undefined;
    const report = typeof fault.resource === 'string' ? reports?.[fault.resource] : undefined;
    return report?.status === 'failed' && !report.reason && typeof fault.radio === 'string' && report?.radio === fault.radio
      && report?.channel?.status === 'confirmed' && report?.width?.status === 'confirmed'
      && report?.power?.status === 'mismatch'
      && typeof report.power.requested_dbm === 'number' && Number.isFinite(report.power.requested_dbm)
      && typeof report.power.reported_dbm === 'number' && Number.isFinite(report.power.reported_dbm);
  };
  const critical = active.some((fault) => fault && typeof fault === 'object'
    && typeof fault.severity === 'string' && fault.severity.toLowerCase() === 'critical' && !powerOnly(fault));
  if (critical) return { color: 'red', label: 'Critical fault', critical: true };
  if (active.length && active.every((fault) => powerOnly(fault) || fault?.code === 'radio_power_mismatch' && fault?.severity === 'warning'))
    return { color: 'orange', label: 'Power warning', critical: false };
  if (active.length) return { color: 'orange', label: 'Fault', critical: false };
  if (unavailable || faults?.stale || (hasFaults && (!faults || !Array.isArray(faults.active)))
    || (input != null && (!value || typeof value !== 'object' || Array.isArray(value))))
    return { color: 'gray', label: '—', critical: false };
  if (typeof sanity !== 'number' || !Number.isFinite(sanity) || sanity < 0 || sanity > 100)
    return { color: 'gray', label: '—', critical: false };
  return { color: sanity === 100 ? 'green' : sanity >= 80 ? 'yellow' : 'red', label: `${sanity}%`, critical: false };
};
