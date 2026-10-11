// Peer evidence only: an AP/SSID supporting MLO does not make every client MLO.
export function isNegotiatedMlo(association: { station?: string; mlo?: unknown }): boolean {
  const mlo = association.mlo as { mld_address?: string; counters_scope?: string; links?: unknown[] } | undefined;
  const mac = (value: unknown): value is string => typeof value === 'string' && /^(?:[0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(value)
    && value.toLowerCase() !== '00:00:00:00:00:00' && (parseInt(value.slice(0, 2), 16) & 1) === 0;
  if (!mlo || !mac(association.station) || !mac(mlo.mld_address) || mlo.mld_address.toLowerCase() !== association.station.toLowerCase()
      || mlo.counters_scope !== 'mld' || !Array.isArray(mlo.links) || mlo.links.length < 2 || mlo.links.length > 16) return false;
  const ids = new Set<number>();
  const addresses = new Set<string>();
  return mlo.links.every((entry) => {
    const link = entry as { link_id?: number; address?: string; bssid?: string; frequency?: number } | null;
    if (!link || !Number.isInteger(link.link_id) || link.link_id! < 0 || link.link_id! > 15 || ids.has(link.link_id!)
        || !mac(link.address) || addresses.has(link.address.toLowerCase()) || !mac(link.bssid)
        || typeof link.frequency !== 'number' || !Number.isFinite(link.frequency)
        || !((link.frequency >= 2400 && link.frequency <= 2500) || (link.frequency >= 4900 && link.frequency < 5925)
          || (link.frequency >= 5925 && link.frequency <= 7125))) return false;
    ids.add(link.link_id!);
    addresses.add(link.address.toLowerCase());
    return true;
  });
}
