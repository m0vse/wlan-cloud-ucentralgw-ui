import React from 'react';
import { Box, Text } from '@chakra-ui/react';

export type Mlo = {
  mldAddress: string;
  countersScope: 'mld';
  links: { linkId: number; mac: string; bssid: string; frequency: number; band: string; channel?: number | null }[];
};

export const MloLinks = ({ mlo }: { mlo: Mlo }) => (
  <Box as="details" whiteSpace="normal" minW="110px">
    <Box as="summary" cursor="pointer">MLO</Box>
    {mlo.links.map((link) => (
      <Box key={link.linkId} mt={1} fontSize="xs">
        <Text>{link.band} · {link.channel != null ? `CH ${link.channel}` : `${link.frequency} MHz`}</Text>
      </Box>
    ))}
  </Box>
);
