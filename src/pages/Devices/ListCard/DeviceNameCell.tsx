import * as React from 'react';
import { Badge, Box, Link, Tooltip } from '@chakra-ui/react';
import { DeviceWithStatus } from 'hooks/Network/Devices';
import { useGetTag } from 'hooks/Network/Inventory';
import { useRadioTopology } from 'hooks/Network/useRadioTopology';

const DeviceNameCell = ({ device }: { device: DeviceWithStatus }) => {
  // Share the existing provisioning-cell query/cache, including its access checks.
  const tag = useGetTag({ serialNumber: device.serialNumber });
  const name = tag.data?.name?.trim();
  const topology = useRadioTopology(device.serialNumber, device.deviceType === 'ap');

  return (
    <Box>
    {name ? <Link href={`#/devices/${device.serialNumber}`} fontSize="sm" title={name}>
      {name}
    </Link> : <span>-</span>}
    {topology.data?.pending && <Box><Tooltip label={`${topology.data.reason ?? 'Pending AP change'} · last reported ${new Date(topology.data.recorded*1000).toLocaleString()}`}><Link href={`#/devices/${device.serialNumber}`}><Badge colorScheme="orange">Reboot required</Badge></Link></Tooltip></Box>}
    </Box>
  );
};

export default DeviceNameCell;
