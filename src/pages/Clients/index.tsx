import React from 'react';
import { Alert, AlertIcon, Badge, Box, Checkbox, Flex, FormControl, FormLabel, Input, Link, Select, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from 'contexts/AuthProvider';
import { Card } from 'components/Containers/Card';
import { CardBody } from 'components/Containers/Card/CardBody';
import { DataGrid } from 'components/DataTables/DataGrid';
import { DataGridColumn, useDataGrid } from 'components/DataTables/DataGrid/useDataGrid';

type AP = { apSerial: string; apName: string; entityId: string; entityName: string; venueId: string; venueName: string; apConnected: boolean };
type Association = AP & { id: string; mac: string; ssid: string; bssid: string; band: string; channel?: number; ip: string; signal?: number; rxRate?: number; txRate?: number; startTime: number | null; endTime: number | null; lastSeen: number };
type Response = { rows: Association[]; aps: AP[]; errors: { apSerial: string; message: string }[]; generatedAt: number; historySamples: number };
const date = (value: number | null) => value ? new Date(value * 1000).toLocaleString() : '—';
const options = (aps: AP[], id: 'entityId' | 'venueId', name: 'entityName' | 'venueName') => Array.from(new Map(aps.filter((ap) => ap[id]).map((ap) => [ap[id], ap[name]])).entries()).sort((a, b) => a[1].localeCompare(b[1]));

const Clients = () => {
  const { user, token } = useAuth();
  const root = user?.userRole === 'root';
  const [historic, setHistoric] = React.useState(false);
  const [entity, setEntity] = React.useState('');
  const [venue, setVenue] = React.useState('');
  const [ap, setAp] = React.useState('');
  const [band, setBand] = React.useState('');
  const [search, setSearch] = React.useState('');
  const columns = React.useMemo<DataGridColumn<Association>[]>(() => [
    { id: 'mac', accessorKey: 'mac', header: 'Client', cell: ({ row }) => <Text fontFamily="mono">{row.original.mac}</Text> },
    { id: 'ip', accessorKey: 'ip', header: 'IP address', cell: ({ row }) => row.original.ip || '—' },
    { id: 'ssid', accessorKey: 'ssid', header: 'SSID' },
    { id: 'apName', accessorKey: 'apName', header: 'AP', cell: ({ row }) => <><Link as={RouterLink} to={`/devices/${row.original.apSerial}`}>{row.original.apName}</Link>{!row.original.apConnected && <Badge ml={2}>AP offline</Badge>}</> },
    { id: 'entityName', accessorKey: 'entityName', header: 'Entity' },
    { id: 'venueName', accessorKey: 'venueName', header: 'Venue' },
    { id: 'band', accessorKey: 'band', header: 'Band' },
    { id: 'channel', accessorKey: 'channel', header: 'Channel', cell: ({ row }) => row.original.channel ?? '—' },
    { id: 'signal', accessorKey: 'signal', header: 'Signal', cell: ({ row }) => row.original.signal == null ? '—' : `${row.original.signal} dBm` },
    { id: 'startTime', accessorKey: 'startTime', header: 'Start', cell: ({ row }) => date(row.original.startTime) },
    { id: 'endTime', accessorKey: 'endTime', header: 'End', cell: ({ row }) => date(row.original.endTime) },
    { id: 'lastSeen', accessorKey: 'lastSeen', header: 'Last report', cell: ({ row }) => date(row.original.lastSeen) },
  ], []);
  const tableController = useDataGrid({ tableSettingsId: 'gateway.clients', defaultOrder: columns.map((column) => column.id) });
  const query = useQuery<Response>(['fleet-clients', token, historic], async () => {
    const response = await fetch(`/clients-api/associations?historic=${historic}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(response.status === 403 ? 'Root access required' : 'Unable to load clients');
    return response.json();
  }, { enabled: root && !!token, refetchInterval: 60000, retry: false });
  React.useEffect(() => tableController.onPaginationChange((previous) => ({ ...previous, pageIndex: 0 })), [historic, entity, venue, ap, band, search]);
  const aps = query.data?.aps ?? [];
  const scopedAps = aps.filter((item) => (!entity || item.entityId === entity) && (!venue || item.venueId === venue));
  const rows = (query.data?.rows ?? []).filter((row) => (!entity || row.entityId === entity) && (!venue || row.venueId === venue) && (!ap || row.apSerial === ap) && (!band || row.band === band) && (!search || [row.mac, row.ip, row.ssid, row.apName, row.apSerial].join(' ').toLowerCase().includes(search.toLowerCase())));
  if (!root) return <Alert status="warning"><AlertIcon />Root access required</Alert>;
  return <Box>
    <Card mb={4}><CardBody><Flex gap={3} wrap="wrap">
      <FormControl width="auto" minW="170px" flex="1"><FormLabel fontSize="sm">Entity</FormLabel><Select value={entity} onChange={(event) => { setEntity(event.target.value); setVenue(''); setAp(''); }}><option value="">All entities</option>{options(aps, 'entityId', 'entityName').map(([id, name]) => <option key={id} value={id}>{name}</option>)}</Select></FormControl>
      <FormControl width="auto" minW="170px" flex="1"><FormLabel fontSize="sm">Venue</FormLabel><Select value={venue} onChange={(event) => { setVenue(event.target.value); setAp(''); }}><option value="">All venues</option>{options(aps.filter((item) => !entity || item.entityId === entity), 'venueId', 'venueName').map(([id, name]) => <option key={id} value={id}>{name}</option>)}</Select></FormControl>
      <FormControl width="auto" minW="170px" flex="1"><FormLabel fontSize="sm">AP</FormLabel><Select value={ap} onChange={(event) => setAp(event.target.value)}><option value="">All APs</option>{scopedAps.map((item) => <option key={item.apSerial} value={item.apSerial}>{item.apName}</option>)}</Select></FormControl>
      <FormControl width="120px"><FormLabel fontSize="sm">Band</FormLabel><Select value={band} onChange={(event) => setBand(event.target.value)}><option value="">All bands</option>{['2G', '5G', '6G', 'Unknown'].map((value) => <option key={value} value={value}>{value}</option>)}</Select></FormControl>
    </Flex></CardBody></Card>
    {query.isError && <Alert status="error" mb={3}><AlertIcon />Unable to load clients. Try Refresh.</Alert>}
    {!!query.data?.errors.length && <Alert status="warning" mb={3}><AlertIcon />Some AP reports are unavailable ({query.data.errors.length}).</Alert>}
    <DataGrid<Association>
      controller={tableController}
      columns={columns}
      data={rows}
      isLoading={query.isFetching}
      header={{
        title: `${rows.length} Clients`,
        objectListed: 'Clients',
        leftContent: <Input bg="white" color="gray.700" width="280px" maxW="100%" aria-label="Search clients" placeholder="Search MAC, IP, SSID or AP" value={search} onChange={(event) => setSearch(event.target.value)} />,
        otherButtons: <Checkbox whiteSpace="nowrap" isChecked={historic} onChange={(event) => setHistoric(event.target.checked)}>Show historic clients</Checkbox>,
      }}
      options={{ showAsCard: true, isManual: false, count: rows.length, refetch: () => query.refetch() }}
    />
    <Text fontSize="xs" color="gray.500" mt={2}>Latest AP reports · refreshed {date(query.data?.generatedAt ?? null)}{historic ? ' · recent history: up to 24 reports per AP; end time is when absence was first observed' : ''}</Text>
  </Box>;
};
export default Clients;
