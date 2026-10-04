export const deviceLogDetails = (log?: { logType: number; data?: Record<string, unknown>; log?: string }) => {
  if (!log) return '';
  if (log.logType !== 2) return log.log ?? '';

  const data = log.data ?? {};
  const info = data.info;
  if (Array.isArray(info) && info.length > 0 && info.every((entry) => typeof entry === 'string')) {
    return info.join('\n');
  }
  return JSON.stringify(data, null, 2);
};
