import * as React from 'react';
import { Box, Button, Code, Heading, useClipboard } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import FormattedDate from 'components/InformationDisplays/FormattedDate';
import { Modal } from 'components/Modals/Modal';
import { DeviceLog } from 'hooks/Network/DeviceLogs';
import { deviceLogDetails } from 'helpers/deviceLogDetails';

type Props = {
  modalProps: {
    isOpen: boolean;
    onClose: () => void;
  };
  log?: DeviceLog;
};

const DetailedLogViewModal = ({ modalProps, log }: Props) => {
  const { t } = useTranslation();
  const content = deviceLogDetails(log);
  const { hasCopied, onCopy, setValue } = useClipboard(content);

  React.useEffect(() => {
    setValue(content);
  }, [content, setValue]);

  if (!log) return null;

  return (
    <Modal
      isOpen={modalProps.isOpen}
      onClose={modalProps.onClose}
      title={t('devices.logs_one')}
      topRightButtons={
        <Button onClick={onCopy} size="md" colorScheme="teal">
          {hasCopied ? `${t('common.copied')}!` : t('common.copy')}
        </Button>
      }
    >
      <Box>
        <Heading size="sm">
          <FormattedDate date={log.recorded} />
        </Heading>
        <Heading size="sm">
          {t('controller.devices.severity')}: {log.severity}
        </Heading>
        <Heading size="sm">
          {t('controller.devices.config_id')}: {log.UUID}
        </Heading>
        <Code whiteSpace="pre-wrap" overflowWrap="anywhere" display="block" mt={2}>
          {content}
        </Code>
      </Box>
    </Modal>
  );
};

export default DetailedLogViewModal;
