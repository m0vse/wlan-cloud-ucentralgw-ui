import React from 'react';
import { Badge, Box, Text } from '@chakra-ui/react';
import DiagnosticReport from 'components/InformationDisplays/DiagnosticReport';
import FormattedDate from 'components/InformationDisplays/FormattedDate';
import { Modal } from 'components/Modals/Modal';
import { HealthCheck } from 'hooks/Network/HealthChecks';
import { healthSummary } from 'helpers/diagnosticReport';

const HealthDetailsModal = ({ health, isOpen, onClose }: { health?: HealthCheck; isOpen: boolean; onClose: () => void }) => {
  if (!health) return null;
  return <Modal isOpen={isOpen} onClose={onClose} title="Health report">
    <Box><FormattedDate date={health.recorded} /> <Badge colorScheme={health.sanity === 100 ? 'green' : 'orange'}>{health.sanity}% health</Badge></Box>
    <Text fontSize="sm" mt={2}>Configuration ID: {health.UUID}</Text>
    {healthSummary(health.values).map((line, index) => <Text mt={2} key={index}>{line}</Text>)}
    <DiagnosticReport value={health.values} rawValue={health} />
  </Modal>;
};
export default HealthDetailsModal;
