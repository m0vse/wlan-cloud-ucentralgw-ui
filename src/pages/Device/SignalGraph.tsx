import * as React from 'react';
import { Box, Heading, Text } from '@chakra-ui/react';
import { Neighbour, neighbourBand } from 'helpers/neighbourData';

const colours = ['#3182ce', '#d69e2e', '#38a169', '#805ad5', '#e53e3e', '#00a3c4', '#d53f8c'];
const colour = (bssid: string) => colours[[...bssid].reduce((sum, char) => sum + char.charCodeAt(0), 0) % colours.length];
export type OwnRadio = { frequency: number; channel: number; label: string; txPower?: number };
const SignalGraph = ({ rows, band, ownRadios = [] }: { rows: Neighbour[]; band: string; ownRadios?: OwnRadio[] }) => {
  const [selected, setSelected] = React.useState<string>();
  const signals = rows.filter((row) => neighbourBand(row.frequency) === band);
  const own = ownRadios.filter((row) => neighbourBand(row.frequency) === band);
  if (!signals.length && !own.length) return null;
  const frequencies = [...signals, ...own].map((row) => row.frequency);
  const min = band === '2.4 GHz' ? 2400 : Math.min(...frequencies) - 20;
  const max = band === '2.4 GHz' ? 2500 : Math.max(...frequencies) + 20;
  const x = (freq: number) => 60 + (freq - min) / (max - min) * 510;
  const y = (signal: number) => 225 - (Math.max(-100, Math.min(-20, signal)) + 100) / 80 * 195;
  const ticks = band === '2.4 GHz' ? [2412, 2432, 2452, 2472, 2484] : [...new Set(frequencies)].sort((a, b) => a - b);
  const tickStride = Math.max(1, Math.ceil(ticks.length / 10));
  const selectedRow = signals.find((row) => row.bssid === selected);
  return <Box mb={4}>
    <Heading size="sm" mb={2}>{band}</Heading>
    <svg viewBox="0 0 600 270" role="img" aria-label={`${band} neighbouring networks by channel and signal`} style={{ width: '100%', display: 'block' }}>
      {own.map((radio) => <g key={`${radio.label}:${radio.frequency}`}>
        <rect x={x(radio.frequency - 10)} y="30" width={x(radio.frequency + 10)-x(radio.frequency-10)} height="195" fill="#718096" opacity="0.12" />
        <line x1={x(radio.frequency)} x2={x(radio.frequency)} y1="30" y2="225" stroke="currentColor" strokeDasharray="5 4" />
        <title>{radio.label} · Own AP · Ch {radio.channel}{radio.txPower !== undefined ? ` · TX ${radio.txPower} dBm` : ''}</title>
      </g>)}
      {[-100, -80, -60, -40, -20].map((signal) => <g key={signal}>
        <line x1="60" x2="570" y1={y(signal)} y2={y(signal)} stroke="currentColor" opacity="0.12" />
        <text x="5" y={y(signal) + 4} fill="currentColor" fontSize="12">{signal}</text>
      </g>)}
      <text x="5" y="15" fill="currentColor" fontSize="12">dBm</text>
      {ticks.filter((_, index) => index % tickStride === 0).map((freq) => {
        const channel = [...signals, ...own].find((row) => row.frequency === freq)?.channel ?? (freq === 2484 ? 14 : (freq - 2407) / 5);
        return <g key={freq}><line x1={x(freq)} x2={x(freq)} y1="225" y2="230" stroke="currentColor" /><text x={x(freq)} y="246" fill="currentColor" fontSize="12" textAnchor="middle">{channel}</text></g>;
      })}
      <text x="310" y="266" fill="currentColor" fontSize="12" textAnchor="middle">Channel</text>
      {[...signals].reverse().map((row) => {
        const left = x(row.frequency - 10), right = x(row.frequency + 10), centre = x(row.frequency), top = y(row.signal);
        const path = `M ${left} 225 C ${left + (centre-left)*0.4} 225 ${centre - (centre-left)*0.6} ${top} ${centre} ${top} C ${centre + (right-centre)*0.6} ${top} ${right - (right-centre)*0.4} 225 ${right} 225`;
        return <g key={`${row.bssid}:${row.frequency}`} onMouseEnter={() => setSelected(row.bssid)} onFocus={() => setSelected(row.bssid)} onClick={() => setSelected(row.bssid)} tabIndex={0} role="button" aria-label={`${row.ssid}, channel ${row.channel}, ${row.signal} dBm`} style={{ cursor: 'pointer' }}>
          <path d={`${path} Z`} fill={colour(row.bssid)} fillOpacity={selected === row.bssid ? 0.2 : 0.035} stroke={colour(row.bssid)} strokeWidth={selected === row.bssid ? 3 : 1.4} opacity={selected && selected !== row.bssid ? 0.25 : 0.9} />
          <title>{row.ssid} · {row.bssid} · channel {row.channel} · {row.signal} dBm</title>
          {(selected === row.bssid || (!selected && signals.indexOf(row) < 6)) && <text x={centre} y={Math.max(15, top-7)} textAnchor="middle" fill={colour(row.bssid)} fontSize="11">{row.ssid.length > 24 ? `${row.ssid.slice(0, 23)}…` : row.ssid}</text>}
        </g>;
      })}
    </svg>
    {own.map((radio) => <Text key={`${radio.label}:${radio.frequency}`} fontSize="xs">Own AP: {radio.label} · Ch {radio.channel}{radio.txPower !== undefined ? ` · TX ${radio.txPower} dBm` : ''}</Text>)}
    <Text fontSize="xs" minH="18px">{selectedRow ? `${selectedRow.ssid} · ${selectedRow.bssid} · Ch ${selectedRow.channel} · ${selectedRow.signal} dBm` : 'Hover or tap a signal · 20 MHz display width'}</Text>
  </Box>;
};
export default SignalGraph;
