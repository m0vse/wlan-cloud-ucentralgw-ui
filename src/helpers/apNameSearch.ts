export const matchApNames = (
  tags: { name?: string; serialNumber: string }[],
  input: string,
): { label: string; value: string; type: 'name' }[] => {
  const query = input.trim().toLowerCase();
  if (query.length < 3) return [];
  return tags.filter(({ name }) => name?.toLowerCase().includes(query)).map(({ name, serialNumber }) => ({
    label: `${name} (${serialNumber})`,
    value: serialNumber,
    type: 'name',
  }));
};
