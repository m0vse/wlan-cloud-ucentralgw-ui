import React from 'react';
import { Center, Tag, TagLabel, TagRightIcon, Tooltip } from '@chakra-ui/react';
import { Heart, HeartBreak } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { axiosGw } from 'constants/axiosInstances';
import { useAuth } from 'contexts/AuthProvider';
import { healthPresentation } from 'helpers/healthStatus';
import { scopedGatewayCapabilities } from 'helpers/scopedGatewayAccess';
import { DeviceWithStatus } from 'hooks/Network/Devices';
import { HealthCheck } from 'hooks/Network/HealthChecks';
import { useEndpointStatus } from 'hooks/useEndpointStatus';

const DeviceHealthCell = ({ device }: { device: DeviceWithStatus }) => {
  const { user, isUserLoaded } = useAuth();
  const { isReady } = useEndpointStatus('owgw');
  const allowed = isUserLoaded && (user?.userRole === 'root' || scopedGatewayCapabilities(user).has('diagnostics.read'));
  // Only rendered rows subscribe. No gateway restart, new API or privilege bypass.
  // Session/policy-specific keys prevent old authorized data crossing a scope change.
  const query = useQuery(['device-health-badge', device.serialNumber, user?.id, user?.userRole,
    user?.securityPolicy, axiosGw.defaults.baseURL], async () => {
    const { data } = await axiosGw.get<{ values: HealthCheck[] }>(
      `device/${encodeURIComponent(device.serialNumber)}/healthchecks?newest=true&limit=1`);
    return data.values?.[0];
  }, { enabled: Boolean(device.connected && isReady && allowed), staleTime: 30000,
    refetchInterval: 30000, cacheTime: 0, keepPreviousData: false, retry: false });
  if (!device.connected) return <Center>-</Center>;
  const health = allowed ? query.data : undefined;
  const presentation = healthPresentation(health?.sanity, health?.values, !allowed || !isReady || query.isError || !health);
  return <Center><Tooltip label={presentation.label === '—' ? 'Health unavailable' : undefined}>
    <Tag data-health-status={presentation.critical ? 'critical' : presentation.color} borderRadius="full" variant="subtle" colorScheme={presentation.color}>
      <TagLabel>{presentation.label}</TagLabel>
      <TagRightIcon marginStart="0.1rem" as={presentation.color === 'green' ? Heart : HeartBreak} />
    </Tag>
  </Tooltip></Center>;
};
export default DeviceHealthCell;
