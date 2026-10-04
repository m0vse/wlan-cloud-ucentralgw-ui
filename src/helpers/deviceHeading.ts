export const deviceHeading = (serial: string, name?: string, description?: string, macAddress?: string) => {
  const mac = macAddress?.trim() || serial;
  const hex = mac.replace(/[:-]/g, '');
  return {
    name: name?.trim() || '',
    description: description?.trim() || '',
    mac: /^[a-f0-9]{12}$/i.test(hex) ? hex.toLowerCase().match(/.{2}/g)!.join(':') : mac,
  };
};
