import React from 'react';
import { Badge, Box, Text } from '@chakra-ui/react';
import DiagnosticReport from 'components/InformationDisplays/DiagnosticReport';
import FormattedDate from 'components/InformationDisplays/FormattedDate';
import { Modal } from 'components/Modals/Modal';
import { HealthCheck } from 'hooks/Network/HealthChecks';
import { healthSummary } from 'helpers/diagnosticReport';
import { healthPresentation } from 'helpers/healthStatus';

const HealthDetailsModal = ({ health, isOpen, onClose }: { health?: HealthCheck; isOpen: boolean; onClose: () => void }) => {
  if (!health) return null;
  const presentation = healthPresentation(health.sanity, health.values);
  return <Modal isOpen={isOpen} onClose={onClose} title="Health report">
    <Box><FormattedDate date={health.recorded} /> <Badge data-health-status={presentation.critical ? 'critical' : presentation.color} colorScheme={presentation.color}>{presentation.label}</Badge></Box>
    <Text fontSize="sm" mt={2}>Configuration ID: {health.UUID}</Text>
    {healthSummary(health.values).map((line, index) => <Text mt={2} key={index}>{line}</Text>)}
    <DiagnosticReport value={health.values} rawValue={health} />
  </Modal>;
};
export default HealthDetailsModal;
