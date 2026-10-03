// Keep saved preferences, but ensure AP Name precedes S/N even in an older layout.
export const withApNameColumn = (order: string[]): string[] => {
  const columns = order.filter((column) => column !== 'apName');
  const serialIndex = columns.indexOf('serialNumber');
  columns.splice(serialIndex < 0 ? 1 : serialIndex, 0, 'apName');
  return columns;
};
