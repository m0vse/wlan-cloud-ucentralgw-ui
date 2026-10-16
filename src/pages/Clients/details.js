// Counters are cumulative per association, not throughput or lifetime totals.
export function trafficSamples(sessions) {
  const result = [];
  for (const session of sessions) {
    let previous;
    for (const point of [...(session.observations || [])].sort((a, b) => a.recorded - b.recorded)) {
      const delta = (key) => {
        if (!previous || point.recorded <= previous.recorded || point.recorded - previous.recorded > 600 ||
            !Number.isFinite(point[key]) || !Number.isFinite(previous[key]) || point[key] < previous[key]) return null;
        return point[key] - previous[key];
      };
      result.push({ ...point, apName: session.apName, sessionId: session.id,
        rxDelta: delta('rx_bytes'), txDelta: delta('tx_bytes') });
      previous = point;
    }
  }
  return result.sort((a, b) => b.recorded - a.recorded);
}

