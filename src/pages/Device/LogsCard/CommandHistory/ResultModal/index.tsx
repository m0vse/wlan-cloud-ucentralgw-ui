import * as React from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Center,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from '@chakra-ui/react';
import DiagnosticReport from 'components/InformationDisplays/DiagnosticReport';
import { useTranslation } from 'react-i18next';
import DownloadScriptButton from './DownloadScriptButton';
import DownloadTraceButton from './DownloadTraceButton';
import DownloadWifiScanButton from './DownloadWifiScanButton';
import { Modal } from 'components/Modals/Modal';
import WifiScanResultDisplay from 'components/Modals/WifiScanModal/ResultDisplay';
import { compactDate } from 'helpers/dateFormatting';
import { uppercaseFirstLetter } from 'helpers/stringHelper';
import { DeviceCommandHistory, useGetSingleCommandHistory } from 'hooks/Network/Commands';
import { WifiScanResult } from 'models/Device';

type Props = {
  modalProps: {
    isOpen: boolean;
    onClose: () => void;
  };
  command?: DeviceCommandHistory;
};

const CommandResultModal = ({ modalProps, command: initialCommandInfo }: Props) => {
  const { t } = useTranslation();
  const { data: command } = useGetSingleCommandHistory({
    commandId: initialCommandInfo?.UUID ?? '',
    serialNumber: initialCommandInfo?.serialNumber ?? '',
  });

  if (!command) return null;

  const results = () => {
    if (command.status === 'failed') {
      return (
        <Center my="50px">
          <Alert w="unset" status="error">
            <AlertIcon />
            <Box>
              <AlertTitle>{uppercaseFirstLetter(command.status)}</AlertTitle>
              <AlertDescription>{command.errorText}</AlertDescription>
            </Box>
          </Alert>
        </Center>
      );
    }
    if (command.command === 'wifiscan') {
      return <WifiScanResultDisplay results={command as unknown as WifiScanResult} setCsvData={() => {}} />;
    }
    // If it's a non-deferred script
    if (
      command.command === 'script' &&
      (command.details?.uri === undefined || command.details?.uri === '') &&
      command.status === 'completed'
    ) {
      return (
        <DiagnosticReport value={command.results?.status?.result ?? command.results} rawValue={command.results} />
      );
    }
    return <DiagnosticReport value={command.results?.status ?? command.results} rawValue={command.results} />;
  };

  return (
    <Modal
      isOpen={modalProps.isOpen}
      onClose={modalProps.onClose}
      title={`${uppercaseFirstLetter(command.command)} - ${compactDate(command.submitted)} `}
      topRightButtons={
        <>
          <DownloadWifiScanButton command={command as unknown as WifiScanResult} />
          <DownloadTraceButton command={command} />
          <DownloadScriptButton command={command} />
        </>
      }
    >
      <Tabs variant="enclosed" w="100%">
        <TabList>
          <Tab>{t('controller.devices.results')}</Tab>
          <Tab>{t('controller.devices.complete_data')}</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>{results()}</TabPanel>
          <TabPanel><DiagnosticReport value={command} /></TabPanel>
        </TabPanels>
      </Tabs>
    </Modal>
  );
};

export default CommandResultModal;
