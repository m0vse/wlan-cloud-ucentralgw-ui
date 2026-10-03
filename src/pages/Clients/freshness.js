// A recent report is an observation, not proof of a live association.
export const STALE_SECONDS = 600;
export function clientStatus(row, now, refreshFailed = false) {
  if (row.endTime != null) return { label: 'Historic', color: 'gray', reason: 'Association ended in a later AP report.' };
  if (refreshFailed) return { label: 'Stale', color: 'orange', reason: 'Controller refresh failed; showing the previous report.' };
  if (!row.apConnected) return { label: 'Stale', color: 'orange', reason: 'AP is offline; association is unconfirmed.' };
  if (!Number.isFinite(row.lastSeen) || row.lastSeen <= 0 || row.lastSeen > now + 60) return { label: 'Unknown', color: 'gray', reason: 'Report timestamp is missing or invalid.' };
  if (now - row.lastSeen > STALE_SECONDS) return { label: 'Stale', color: 'orange', reason: 'No association report in the last 10 minutes.' };
  return { label: 'Recent', color: 'green', reason: 'Seen in an AP report within the last 10 minutes; not a live connectivity check.' };
}
export function latestClients(rows, historic) {
  if (historic) return rows;
  const latest = new Map();
  for (const row of rows) {
    if (row.endTime != null) continue;
    const key = String(row.mac).toLowerCase().replace(/[:-]/g, '');
    const old = latest.get(key);
    const time = Number.isFinite(row.lastSeen) ? row.lastSeen : 0;
    const oldTime = Number.isFinite(old?.lastSeen) ? old.lastSeen : 0;
    if (!old || time > oldTime || (time === oldTime && row.apConnected && !old.apConnected)) latest.set(key, row);
  }
  return [...latest.values()];
}
export function statusColumnOrder(order) {
  if (order.includes('status')) return order;
  const result = [...order];
  result.splice(Math.max(0, result.indexOf('vendor') + 1), 0, 'status');
  return result;
}
