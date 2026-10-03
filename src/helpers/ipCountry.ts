// Display-only mapping for this private deployment; not a radio country policy.
export const getDisplayCountry = (address = '', fallback = ''): string => {
  const normalized = address.trim().replace(/^::ffff:/i, '');
  if (!/^(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?$/.test(normalized)) return fallback;
  const octets = normalized.split(':')[0].split('.').map(Number);
  if (octets.some((value) => value > 255)) return fallback;
  return octets[0] === 192 && octets[1] === 168 ? 'GB' : fallback;
};
