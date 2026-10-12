import React from 'react';
import { Alert, AlertIcon, Box, Button, Heading, SimpleGrid, Spinner, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { axiosGw } from 'constants/axiosInstances';
import { useAuth } from 'contexts/AuthProvider';
import { scopedGatewayCapabilities } from 'helpers/scopedGatewayAccess';

type ScopedDevice = { serialNumber: string; connected?: boolean };
const loadOverview = async (signal?: AbortSignal) => {
  const devices = new Map<string, ScopedDevice>();
  const limit = 500;
  for (let page = 0; page < 10; page += 1) {
    const { data } = await axiosGw.get(`devices?deviceWithStatus=true&limit=${limit}&offset=${page * limit}&platform=all`, { signal });
    if (!Array.isArray(data.devicesWithStatus)) throw new Error('Invalid device list.');
    const entries: ScopedDevice[] = data.devicesWithStatus;
    for (const device of entries) {
      if (typeof device?.serialNumber === 'string' && device.serialNumber) devices.set(device.serialNumber, device);
    }
    if (entries.length < limit) return { devices: [...devices.values()], limited: false };
  }
  return { devices: [...devices.values()], limited: true };
};

// Every page is authorized and filtered by the API. No global aggregates or
// expanded device details are requested, and old policy results are not reused.
const ScopedOverview = () => {
  const { user, isUserLoaded } = useAuth();
  const allowed = isUserLoaded && user?.userRole !== 'root' && scopedGatewayCapabilities(user).has('devices.read');
  const query = useQuery(['scoped-device-overview', user?.id, user?.userRole, user?.securityPolicy, axiosGw.defaults.baseURL],
    ({ signal }) => loadOverview(signal), { enabled: allowed, keepPreviousData: false, staleTime: 0, cacheTime: 0,
      retry: false, refetchInterval: 30000 });
  if (!allowed) return <Alert status="error"><AlertIcon />Device access is not assigned.</Alert>;
  if (query.isLoading) return <Spinner aria-label="Loading scoped device overview" />;
  if (query.isError || !query.data) return <Alert status="error"><AlertIcon />Your device overview could not be loaded.
    <Button ml={3} onClick={() => query.refetch()}>Retry</Button></Alert>;
  const connected = query.data.devices.filter((device) => device.connected === true).length;
  const disconnected = query.data.devices.filter((device) => device.connected === false).length;
  const counts = [['Visible devices', query.data.devices.length], ['Connected', connected], ['Disconnected', disconnected],
    ['Status not reported', query.data.devices.length - connected - disconnected]] as const;
  return <Box>
    <Heading size="md" mb={3}>Your device overview</Heading>
    <Text mb={4}>Only devices assigned to your access are included. Connection status is as reported by the device list.</Text>
    {query.data.limited && <Alert status="warning" mb={4}><AlertIcon />Showing the first 5,000 authorized device records; counts may be partial.</Alert>}
    {!query.data.devices.length && <Text mb={4}>No devices are currently visible in your assigned scope.</Text>}
    <SimpleGrid columns={[1, 2, 4]} spacing={4}>{counts.map(([label, count]) =>
      <Box key={label} borderWidth="1px" borderRadius="md" p={4}><Text>{label}</Text><Text fontSize="2xl" data-testid={label}>{count}</Text></Box>)}</SimpleGrid>
    <Button mt={4} onClick={() => query.refetch()} isLoading={query.isFetching}>Refresh overview</Button>
  </Box>;
};
export default ScopedOverview;
