import * as React from 'react';
import { Alert, AlertIcon, Box, Button, Text, Tooltip } from '@chakra-ui/react';
import { useRadioTopology } from 'hooks/Network/useRadioTopology';

const TopologyWarning = ({ serialNumber, enabled, connected, onReboot }: {
  serialNumber: string; enabled: boolean; connected?: boolean; onReboot: () => void;
}) => {
  const topology = useRadioTopology(serialNumber, enabled);
  if (!enabled || !topology.data?.pending) return null;
  const state = topology.data;
  return <Alert status="warning" mb={4} borderRadius="md" flexWrap="wrap" gap={2}>
    <AlertIcon />
    <Box flex="1" minW="200px">
      <Tooltip label={state.reason ?? 'The AP reports a pending change that requires a reboot.'}><Text fontWeight="medium">Reboot required</Text></Tooltip>
      {(!connected || topology.isError || Date.now()/1000-state.recorded > 300) && <Text fontSize="xs">Last reported: {new Date(state.recorded*1000).toLocaleString()}</Text>}
    </Box>
    <Button size="sm" colorScheme="orange" onClick={onReboot} isDisabled={!connected}>Reboot</Button>
  </Alert>;
};
export default TopologyWarning;
