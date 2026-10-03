import * as React from 'react';
import { Box, Link } from '@chakra-ui/react';
import { DeviceWithStatus } from 'hooks/Network/Devices';
import { useGetTag } from 'hooks/Network/Inventory';

const DeviceNameCell = ({ device }: { device: DeviceWithStatus }) => {
  // Share the existing provisioning-cell query/cache, including its access checks.
  const tag = useGetTag({ serialNumber: device.serialNumber });
  const name = tag.data?.name?.trim();

  return (
    <Box>
    {name ? <Link href={`#/devices/${device.serialNumber}`} fontSize="sm" title={name}>
      {name}
    </Link> : <span>-</span>}
    </Box>
  );
};

export default DeviceNameCell;
