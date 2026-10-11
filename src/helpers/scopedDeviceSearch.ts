import { axiosGw } from 'constants/axiosInstances';

export const searchScopedDevices = async (input: string) => {
  const query = input.trim().toLowerCase().replace(/\*/g, '');
  if (query.length < 3) return [];
  const matches: { label: string; value: string; type: 'serial' }[] = [];
  // The server filters every page before applying its offset. Never consult
  // global notification searches or an unfiltered controller inventory.
  const limit = 100;
  for (let page = 0; page < 50; page += 1) {
    const { data } = await axiosGw.get(`devices?deviceWithStatus=true&limit=${limit}&offset=${page * limit}&platform=all`);
    const devices: { serialNumber: string }[] = data.devicesWithStatus ?? [];
    for (const { serialNumber } of devices) {
      if (typeof serialNumber === 'string' && serialNumber.toLowerCase().startsWith(query))
        matches.push({ label: serialNumber, value: serialNumber, type: 'serial' });
    }
    if (devices.length < limit || matches.length >= 100) break;
  }
  return matches.slice(0, 100);
};
