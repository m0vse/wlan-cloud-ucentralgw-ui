import React from 'react';
import { Box, Text } from '@chakra-ui/react';

export type Mlo = {
  mldAddress: string;
  countersScope: 'mld';
  links: { linkId: number; mac: string; bssid: string; frequency: number; band: string; channel?: number | null }[];
};

export const MloLinks = ({ mlo }: { mlo: Mlo }) => (
  <Box as="details" whiteSpace="normal" minW="180px">
    <Box as="summary" cursor="pointer">MLO · {mlo.links.length} links</Box>
    <Text fontSize="xs" mt={1}>Negotiated links; traffic counters are shared, not added.</Text>
    {mlo.links.map((link) => (
      <Box key={link.linkId} mt={2} fontSize="xs">
        <Text>{link.band} · link {link.linkId} · {link.channel != null ? `channel ${link.channel}` : `${link.frequency} MHz`}</Text>
        <Text fontFamily="mono">Client: {link.mac}</Text>
        <Text fontFamily="mono">BSSID: {link.bssid}</Text>
      </Box>
    ))}
  </Box>
);
