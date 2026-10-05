/** Display thresholds for used RAM, shared by all device families. */
export const memoryHealthColor = (usedPercent: number): 'green' | 'yellow' | 'red' => {
  if (usedPercent >= 90) return 'red';
  if (usedPercent >= 75) return 'yellow';
  return 'green';
};
