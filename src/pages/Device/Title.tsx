import React from 'react';
import { Box, Heading, Text } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { useGetDevice } from 'hooks/Network/Devices';
import { useGetTag } from 'hooks/Network/Inventory';
import { deviceHeading } from 'helpers/deviceHeading';

const DeviceTitle = ({ serialNumber }: { serialNumber: string }) => {
  const { t } = useTranslation();
  const tag = useGetTag({ serialNumber });
  const device = useGetDevice({ serialNumber });
  const title = deviceHeading(serialNumber, tag.data?.name, tag.data?.description, device.data?.macAddress);

  return (
    <Box minW={0} maxW={{ base: '55vw', lg: '60vw' }} position="relative" top="-2px">
      <Heading size="lg" lineHeight="1.15" noOfLines={1} title={`${title.name || t('devices.one')}${title.description ? ` (${title.description})` : ''}`}>
        {title.name || t('devices.one')}
        {title.description && <Text as="span" fontSize="md" fontWeight="normal"> ({title.description})</Text>}
      </Heading>
      <Text fontSize="sm" lineHeight="1.2" color="gray.500" fontFamily="mono">{title.mac}</Text>
    </Box>
  );
};

export default DeviceTitle;
