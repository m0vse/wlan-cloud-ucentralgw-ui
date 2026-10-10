type AddressedInterface = {
  name?: string;
  ipv4?: { addresses?: unknown[] };
  ipv6?: { addresses?: unknown[] };
};

export const usableInterfaceAddress = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const parts = value.trim().split('/');
  if (parts.length > 2) return null;
  const address = parts[0];
  const prefix = parts[1];
  if (prefix !== undefined && !/^\d+$/.test(prefix)) return null;
  if (!address.includes(':')) {
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(address)) return null;
    const octets = address.split('.').map(Number);
    if (octets.some((n) => n > 255) || (prefix !== undefined && Number(prefix) > 32)) return null;
    if (octets[0] === 0 || octets[0] === 127 || octets[0] >= 224) return null;
    return octets.join('.');
  }
  if (prefix !== undefined && Number(prefix) > 128) return null;
  const [host, scope, extra] = address.split('%');
  if (extra !== undefined || (scope !== undefined && !/^[a-zA-Z0-9_.:-]+$/.test(scope))) return null;
  try {
    const normalized = new URL(`http://[${host}]/`).hostname.slice(1, -1);
    if (normalized === '::' || normalized === '::1' || normalized.startsWith('ff')) return null;
    return normalized + (scope ? `%${scope}` : '');
  } catch {
    return null;
  }
};

export const deviceInterfaceAddresses = (interfaces: AddressedInterface[] | undefined, peerIp?: string) => {
  const peer = usableInterfaceAddress(peerIp);
  return (Array.isArray(interfaces) ? interfaces : []).flatMap((iface) => {
    if (!iface || typeof iface !== 'object') return [];
    const v4 = Array.isArray(iface.ipv4?.addresses) ? iface.ipv4.addresses : [];
    const v6 = Array.isArray(iface.ipv6?.addresses) ? iface.ipv6.addresses : [];
    const ipv4 = [...new Set(v4.map(usableInterfaceAddress).filter((a): a is string => !!a))];
    const ipv6 = [...new Set(v6.map(usableInterfaceAddress).filter((a): a is string => !!a))];
    return ipv4.length || ipv6.length
      ? [{ name: iface.name || 'Interface', ipv4, ipv6, management: !!peer && [...ipv4, ...ipv6].includes(peer) }]
      : [];
  }).sort((a, b) => Number(b.management) - Number(a.management) || a.name.localeCompare(b.name));
};
