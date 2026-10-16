import React from 'react';
import { Alert, AlertIcon, Badge, Box, Button, Flex, Grid, Heading, Link, Spinner, Tab, TabList, TabPanel, TabPanels, Table, TableContainer, Tabs, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { Modal } from 'components/Modals/Modal';
import { Mlo, MloLinks } from './MloLinks';
import { trafficSamples } from './details';

type Observation = {
  recorded: number; mac: string; bssid: string; ssid: string; band: string; channel?: number;
  signal?: number; ip?: string; mlo?: Mlo; rx_bytes?: number; tx_bytes?: number;
  rx_packets?: number; tx_packets?: number; tx_retries?: number; tx_failed?: number;
  rxRate?: number; txRate?: number; mode?: string; encryption?: string; authentication?: string; hostname?: string;
};
type Session = Observation & {
  id: string; apSerial: string; apName: string; venueName: string; entityName: string;
  startTime?: number; endTime?: number; firstSeen?: number; lastSeen: number; apConnected: boolean;
  observations: Observation[];
};
type Details = {
  mac: string; addresses: string[]; sessions: Session[]; observations: Observation[];
  transitions: { recorded: number; fromAP: string; toAP: string; fromSerial: string; toSerial: string }[];
  errors: { apSerial: string; message: string }[]; historySamples: number; limits: string;
  generatedAt: number; coverage: { from?: number; to?: number };
};
const date = (value?: number | null) => value == null ? '—' : new Date(value * 1000).toLocaleString();
const bytes = (value?: number | null) => {
  if (value == null || !Number.isFinite(value)) return '—';
  if (value < 1024) return `${value} B`;
  const power = Math.min(4, Math.floor(Math.log(value) / Math.log(1024)));
  return `${(value / (1024 ** power)).toFixed(1)} ${['B', 'KiB', 'MiB', 'GiB', 'TiB'][power]}`;
};
const AP = ({ serial, name }: { serial: string; name: string }) => <Link as={RouterLink} to={`/devices/${serial}`}>{name}</Link>;
const Value = ({ label, children }: { label: string; children: React.ReactNode }) => <Box><Text fontSize="sm" color="gray.500">{label}</Text><Box overflowWrap="anywhere">{children || '—'}</Box></Box>;

export const ClientDetails = ({ mac, token, vendor, onClose }: { mac: string; token: string; vendor?: string; onClose: () => void }) => {
  const query = useQuery<Details>(['client-detail', token, mac], async ({ signal }) => {
    const response = await fetch(`/clients-api/client?mac=${encodeURIComponent(mac)}`, { signal, headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'Access unavailable' : 'Unable to load client details');
    return response.json();
  }, { enabled: !!token && !!mac, retry: false, cacheTime: 0 });
  const data = query.isError ? undefined : query.data;
  const latest = data?.sessions.reduce<Session | undefined>((best, row) => !best || row.lastSeen > best.lastSeen ? row : best, undefined);
  const traffic = React.useMemo(() => trafficSamples(data?.sessions ?? []), [data]);
  const [visible, setVisible] = React.useState(50);
  const recent = !!latest && latest.endTime == null && latest.apConnected && (data?.generatedAt ?? 0) - latest.lastSeen < 600;
  return <Modal isOpen onClose={onClose} title={mac} options={{ modalSize: 'lg' }} topRightButtons={<Button size="sm" onClick={() => query.refetch()} isLoading={query.isFetching}>Refresh</Button>}>
    <Box pb={4}>
      {query.isLoading && <Flex justify="center" p={8}><Spinner /></Flex>}
      {query.isError && <Alert status="error"><AlertIcon />{(query.error as Error).message}</Alert>}
      {data && <>
        {!!data.errors.length && <Alert status="warning" mb={3}><AlertIcon />Some AP history is unavailable. This view may be incomplete.</Alert>}
        <Tabs isLazy>
          <TabList overflowX="auto"><Tab>Overview</Tab><Tab>Associations</Tab><Tab>Roaming</Tab><Tab>Traffic</Tab></TabList>
          <TabPanels>
            <TabPanel px={0}>
              {!latest ? <Text>No matching client reports in the retained window.</Text> : <>
                <Flex mb={4} gap={3} align="center"><Badge colorScheme={recent ? 'green' : 'gray'}>{recent ? 'Recent' : 'Historic / stale'}</Badge>{latest.mlo ? <MloLinks mlo={latest.mlo} /> : <Badge>{latest.band}</Badge>}</Flex>
                <Grid templateColumns={{ base: '1fr', md: 'repeat(3,1fr)' }} gap={4}>
                  <Value label="Vendor">{vendor}</Value><Value label="Hostname">{latest.hostname}</Value><Value label="AP"><AP serial={latest.apSerial} name={latest.apName} /></Value><Value label="SSID">{latest.ssid}</Value>
                  <Value label="IP addresses">{latest.ip}</Value><Value label="Signal">{latest.signal == null ? '—' : `${latest.signal} dBm`}</Value><Value label="Channel">{latest.mlo ? latest.mlo.links.map(link => `${link.band}: ${link.channel ?? '—'}`).join(' · ') : latest.channel}</Value>
                  <Value label="Last report">{date(latest.lastSeen)}</Value><Value label="Association start">{date(latest.startTime)}</Value><Value label="Venue / entity">{[latest.venueName, latest.entityName].filter(Boolean).join(' / ')}</Value>
                  <Value label="Mode">{latest.mode}</Value><Value label="Authentication">{latest.authentication}</Value><Value label="Encryption">{latest.encryption}</Value>
                  <Value label="Reported RX / TX rate">{`${latest.rxRate ?? '—'} / ${latest.txRate ?? '—'}`}</Value><Value label="RX / TX packets">{`${latest.rx_packets ?? '—'} / ${latest.tx_packets ?? '—'}`}</Value><Value label="TX retries / failures">{`${latest.tx_retries ?? '—'} / ${latest.tx_failed ?? '—'}`}</Value>
                </Grid>
              </>}
              <Heading size="sm" mt={5} mb={2}>MAC addresses</Heading><Text fontFamily="mono" fontSize="sm">{data.addresses.join(' · ')}</Text>
            </TabPanel>
            <TabPanel px={0}>
              <TableContainer maxH="55vh" overflowY="auto"><Table size="sm"><Thead><Tr><Th>AP / SSID</Th><Th>Band</Th><Th>Start</Th><Th>Last report</Th><Th>End observed</Th></Tr></Thead><Tbody>
                {[...data.sessions].reverse().map(row => <Tr key={row.id}><Td><AP serial={row.apSerial} name={row.apName} /><Text fontSize="xs">{row.ssid}</Text></Td><Td>{row.band}</Td><Td>{date(row.startTime)}</Td><Td>{date(row.lastSeen)}</Td><Td>{date(row.endTime)}</Td></Tr>)}
              </Tbody></Table></TableContainer>
              {!data.sessions.length && <Text mt={3}>No retained associations.</Text>}
            </TabPanel>
            <TabPanel px={0}>
              <Text fontSize="sm" mb={3}>AP changes observed in reports; not confirmed roaming events.</Text>
              {data.transitions.length ? <Table size="sm"><Thead><Tr><Th>Observed</Th><Th>From</Th><Th>To</Th></Tr></Thead><Tbody>{[...data.transitions].reverse().map((event, index) => <Tr key={`${event.recorded}-${index}`}><Td>{date(event.recorded)}</Td><Td><AP serial={event.fromSerial} name={event.fromAP} /></Td><Td><AP serial={event.toSerial} name={event.toAP} /></Td></Tr>)}</Tbody></Table> : <Text>No AP changes found in the retained window.</Text>}
            </TabPanel>
            <TabPanel px={0}>
              <Text fontSize="sm" mb={3}>AP-reported counters. Deltas cover consecutive reports in one association; resets and gaps are not added as traffic.</Text>
              <TableContainer maxH="55vh" overflowY="auto"><Table size="sm"><Thead><Tr><Th>Report / AP</Th><Th>RX</Th><Th>TX</Th><Th>RX Δ</Th><Th>TX Δ</Th><Th>Signal</Th></Tr></Thead><Tbody>{traffic.slice(0, visible).map((point: Observation & { sessionId: string; apName: string; rxDelta?: number; txDelta?: number }) => <Tr key={`${point.sessionId}-${point.recorded}`}><Td>{date(point.recorded)}<Text fontSize="xs">{point.apName}</Text></Td><Td>{bytes(point.rx_bytes)}</Td><Td>{bytes(point.tx_bytes)}</Td><Td>{bytes(point.rxDelta)}</Td><Td>{bytes(point.txDelta)}</Td><Td>{point.signal == null ? '—' : `${point.signal} dBm`}</Td></Tr>)}</Tbody></Table></TableContainer>
              {!traffic.some((point: Observation) => point.rx_bytes != null || point.tx_bytes != null) && <Text mt={3}>No byte counters available in these reports.</Text>}
              {traffic.length > visible && <Button size="sm" mt={3} onClick={() => setVisible(value => value + 100)}>Show more</Button>}
            </TabPanel>
          </TabPanels>
        </Tabs>
        <Text fontSize="xs" color="gray.500" mt={3}>{date(data.coverage.from)} – {date(data.coverage.to)} · up to {data.historySamples} reports per AP</Text>
        <Text fontSize="xs" color="gray.500">{data.limits}</Text>
        <Box as="details" mt={3}><Box as="summary" cursor="pointer" fontSize="sm">Raw JSON</Box><Box as="pre" fontSize="xs" overflow="auto" maxH="300px" mt={2}>{JSON.stringify(data, null, 2)}</Box></Box>
      </>}
    </Box>
  </Modal>;
};
