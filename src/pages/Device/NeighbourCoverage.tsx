import * as React from 'react';
import { Alert, Box, Button, Heading, HStack, Select, Table, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { axiosGw } from 'constants/axiosInstances';
import { Card } from 'components/Containers/Card';
import { CardBody } from 'components/Containers/Card/CardBody';
import { CardHeader } from 'components/Containers/Card/CardHeader';
import { normalizeNeighbours, neighbourBand } from 'helpers/neighbourData';
import { useGetDeviceNewestStats } from 'hooks/Network/Statistics';
import SignalGraph, { OwnRadio } from './SignalGraph';

const NeighbourCoverage = ({ serialNumber }: { serialNumber: string }) => {
  const [band, setBand] = React.useState('all');
  const stats = useGetDeviceNewestStats({ serialNumber, limit: 1 });
  const snapshot = stats.data?.data?.[0];
  const ownRadios: OwnRadio[] = (snapshot?.data.radios ?? []).flatMap((radio) => {
    const channel = Number(radio.channel);
    const reported = radio.frequency?.find((freq) => freq > 2000);
    const bands = radio.band ?? [];
    const frequency = reported ?? (bands.includes('6G') ? 5950 + channel * 5 : channel === 14 ? 2484 : channel <= 13 ? 2407 + channel * 5 : 5000 + channel * 5);
    if (!channel || !Number.isFinite(frequency)) return [];
    const names = (snapshot?.data.interfaces ?? []).flatMap((iface) => iface.ssids ?? []).filter((ssid) => ssid.phy === radio.phy || ssid.radio?.$ref?.endsWith(`/${snapshot?.data.radios?.indexOf(radio)}`)).map((ssid) => ssid.ssid);
    return [{ frequency, channel, label: [...new Set(names)].join(', ') || radio.phy, txPower: radio.tx_power }];
  });
  const scans = useQuery(['neighbour-scan-history', serialNumber], async () => {
    const { data } = await axiosGw.get(`commands?serialNumber=${encodeURIComponent(serialNumber)}&newest=true&limit=200`);
    return (data.commands ?? []).filter((entry: any) => entry.command === 'wifiscan').sort((a: any, b: any) => b.submitted - a.submitted);
  }, { staleTime: 30000, refetchInterval: 60000 });
  const latest = scans.data?.[0];
  const successful = scans.data?.find((entry: any) => entry.status === 'completed' && entry.errorCode === 0 &&
    !entry.results?.status?.error && Array.isArray(entry.results?.status?.scan));
  const neighbours = normalizeNeighbours(successful?.results?.status?.scan);
  const rows = neighbours.filter((row) => band === 'all' || neighbourBand(row.frequency) === band);
  const measured = successful?.completed || successful?.executed;
  const age = measured ? Math.max(0, Date.now() / 1000 - measured) : undefined;
  return (
    <Card mb={4}>
      <CardHeader><Heading size="md">RRM neighbour coverage</Heading></CardHeader>
      <CardBody display="block">
        <HStack mb={3}>
          <Select value={band} onChange={(event) => setBand(event.target.value)} aria-label="Neighbour frequency band">
            <option value="all">All bands</option><option>2.4 GHz</option><option>5 GHz</option><option>6 GHz</option>
          </Select>
          <Button flexShrink={0} onClick={() => scans.refetch()} isLoading={scans.isFetching}>Refresh</Button>
        </HStack>
        {scans.isError ? <Alert status="error">Scan history unavailable.</Alert> : null}
        {scans.isLoading ? <Text>Loading…</Text> : null}
        {latest && latest !== successful ? <Alert status="warning" mb={3}>Latest scan: {latest.status}{successful ? ' — showing previous result' : ''}.</Alert> : null}
        {measured ? <Text fontSize="sm" mb={3}>{new Date(measured * 1000).toLocaleString()} · {neighbours.length} signals{age! > 86400 ? ' · stale' : ''}</Text> : null}
        {!scans.isLoading && !successful ? <Text>No scan results.</Text> : null}
        {successful && !rows.length ? <Text>No signals in this band.</Text> : null}
        {['2.4 GHz', '5 GHz', '6 GHz'].filter((value) => band === 'all' || value === band).map((value) => <SignalGraph key={value} rows={rows} band={value} ownRadios={ownRadios} />)}
        {!!ownRadios.length && snapshot?.recorded ? <Text fontSize="xs" mb={3}>Own AP telemetry: {new Date(snapshot.recorded * 1000).toLocaleString()} · shaded channels (not received RSSI)</Text> : null}
        {!!rows.length && <details><summary style={{ cursor: 'pointer' }}>{rows.length} networks · details</summary><Box overflowX="auto"><Table size="sm">
          <Thead><Tr><Th>SSID / BSSID</Th><Th>Band / channel</Th><Th>Signal at this AP</Th></Tr></Thead>
          <Tbody>{rows.map((row) => <Tr key={`${row.bssid}:${row.frequency}`}>
            <Td><Text>{row.ssid}</Text><Text fontSize="xs" color="gray.500">{row.bssid}</Text></Td>
            <Td>{neighbourBand(row.frequency)}<Text fontSize="xs">Ch {row.channel} · {row.frequency} MHz</Text></Td>
            <Td minW="150px"><Text>{row.signal} dBm</Text><Box h="6px" bg="gray.200" borderRadius="full" aria-hidden="true"><Box h="6px" bg="blue.400" borderRadius="full" w={`${Math.max(0, Math.min(100, (row.signal + 100) / 70 * 100))}%`} /></Box></Td>
          </Tr>)}</Tbody>
        </Table></Box></details>}
      </CardBody>
    </Card>
  );
};
export default NeighbourCoverage;
