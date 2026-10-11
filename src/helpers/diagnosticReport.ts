export type DiagnosticRow = { label: string; value: string };
export type DiagnosticSection = { title: string; rows: DiagnosticRow[] };

export const parseDiagnostic = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return value; }
};

export const diagnosticLabel = (key: string) => key
  .replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ')
  .replace(/\b(ssid|bssid|mlo|dfs|phy|ip|uuid)\b/gi, (word) => word.toUpperCase())
  .replace(/^./, (letter) => letter.toUpperCase());

export const diagnosticText = (value: unknown): string => {
  if (value === null || value === undefined) return 'Not reported';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') return value || '(empty)';
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value) && value.length === 0) return 'None reported';
  if (typeof value === 'object' && Object.keys(value).length === 0) return 'No details reported';
  return JSON.stringify(value);
};

// Bounded report view; the raw disclosure retains the complete original payload.
export const diagnosticSections = (input: unknown): DiagnosticSection[] => {
  const value = parseDiagnostic(input);
  if (!value || typeof value !== 'object') return [];
  const sections: DiagnosticSection[] = [];
  let remaining = 300;
  const visit = (item: unknown, prefix: string, rows: DiagnosticRow[], depth: number) => {
    if (remaining <= 0) return;
    if (typeof item === 'string' && /^[\s]*[\[{]/.test(item)) {
      const decoded = parseDiagnostic(item);
      if (decoded && typeof decoded === 'object') item = decoded;
    }
    if (item && typeof item === 'object' && Object.keys(item).length > 0 && depth < 6) {
      if (Array.isArray(item) && item.every((entry) => entry === null || typeof entry !== 'object')) {
        rows.push({ label: prefix, value: item.slice(0, 30).map(diagnosticText).join(', ') + (item.length > 30 ? ' … (see Raw JSON)' : '') }); remaining -= 1;
      } else {
        Object.entries(item).forEach(([key, entry]) => visit(entry,
          prefix ? `${prefix} · ${Array.isArray(item) ? Number(key) + 1 : diagnosticLabel(key)}` : diagnosticLabel(key), rows, depth + 1));
      }
    } else {
      const text = diagnosticText(item);
      rows.push({ label: prefix || 'Value', value: text.length > 4096 ? `${text.slice(0, 4096)} … (see Raw JSON)` : text }); remaining -= 1;
    }
  };
  Object.entries(value).forEach(([key, item]) => {
    const rows: DiagnosticRow[] = [];
    visit(item, '', rows, 0);
    if (rows.length) sections.push({ title: diagnosticLabel(key), rows });
  });
  if (remaining <= 0) sections.push({ title: 'Additional details', rows: [{ label: 'Report limit', value: 'Open Raw JSON for the complete payload.' }] });
  return sections;
};

export const healthSummary = (input: unknown): string[] => {
  const value = parseDiagnostic(input);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  const health = value as Record<string, any>;
  const lines: string[] = [];
  if (typeof health.unit?.memory === 'number') lines.push(`Reported memory usage: ${health.unit.memory}%`);
  if (Array.isArray(health.faults?.active)) lines.push(health.faults.active.length
    ? `Active monitored faults: ${health.faults.active.length}` : 'No active monitored faults reported.');
  for (const [radio, issue] of Object.entries(health.radios ?? {}) as [string, any][]) {
    for (const [ssid, reason] of Object.entries(issue?.failed_ssids ?? {}))
      lines.push(`${radio} · ${ssid}: ${reason === 'no_channel' ? 'No operating channel reported' : diagnosticText(reason)}`);
  }
  for (const [radio, ssids] of Object.entries(health.dfs_cac ?? {}) as [string, any][]) {
    for (const [ssid, status] of Object.entries(ssids ?? {}) as [string, any][])
      lines.push(`${radio} · ${ssid}: DFS channel check${typeof status?.remaining === 'number' ? `, ${status.remaining}s remaining` : ''}`);
  }
  return lines;
};
