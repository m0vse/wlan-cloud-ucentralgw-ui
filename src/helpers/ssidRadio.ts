// Logical MLO radios may share a physical PHY. Prefer the exact schema reference.
export function ssidRadio<T extends { phy?: string }>(ssid: { phy?: string; radio?: { $ref?: string } }, radios: T[]): T | undefined {
  const match = /^#\/radios\/(\d+)$/.exec(ssid.radio?.$ref ?? '');
  if (match && radios[Number(match[1])]) return radios[Number(match[1])];
  return ssid.phy ? radios.find((radio) => radio.phy === ssid.phy) : undefined;
}
