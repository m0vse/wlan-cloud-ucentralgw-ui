// Display only: never infer a radio's regulatory country from a private address.
export const isRFC1918 = (address = ''): boolean => {
  const normalized = address.trim().replace(/^\[::ffff:([^\]]+)\](?::\d+)?$/i, '$1').replace(/^::ffff:/i, '');
  if (!/^(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?$/.test(normalized)) return false;
  const octets = normalized.split(':')[0].split('.').map(Number);
  if (octets.some((value) => value > 255)) return false;
  return octets[0] === 10 || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168);
};

export const getDisplayCountry = (address = '', fallback = ''): string =>
  isRFC1918(address) ? '' : fallback;
