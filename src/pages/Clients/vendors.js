export const normalizeMac = (value) => String(value ?? '').toLowerCase().replace(/[:-]/g, '');
export const isPrivateMac = (mac) => /^[0-9a-f]{12}$/.test(normalizeMac(mac)) && (parseInt(normalizeMac(mac).slice(0, 2), 16) & 2) !== 0;
export const vendorFor = (mac, vendors) => isPrivateMac(mac) ? 'Private MAC' : vendors[normalizeMac(mac)] || 'Unknown';
export function vendorColumnOrder(order) {
  if (order.includes('vendor')) return order;
  const updated = [...order];
  updated.splice(Math.max(0, updated.indexOf('mac') + 1), 0, 'vendor');
  return updated;
}
