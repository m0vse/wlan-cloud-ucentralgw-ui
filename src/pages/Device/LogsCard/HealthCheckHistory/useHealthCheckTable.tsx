import * as React from 'react';
import { Badge, Box, IconButton, useDisclosure } from '@chakra-ui/react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import HealthDetailsModal from './DetailsModal';
import { useTranslation } from 'react-i18next';
import FormattedDate from 'components/InformationDisplays/FormattedDate';
import { HealthCheck, useGetHealthChecks, useGetHealthChecksWithTimestamps } from 'hooks/Network/HealthChecks';
import { Column } from 'models/Table';

type Props = {
  serialNumber: string;
  limit: number;
};

const useHealthCheckTable = ({ serialNumber, limit }: Props) => {
  const { t } = useTranslation();
  const getHealthChecks = useGetHealthChecks({ serialNumber, limit });
  const modalProps = useDisclosure();
  const [selectedHealth, setSelectedHealth] = React.useState<HealthCheck>();
  const [time, setTime] = React.useState<{ start: Date; end: Date } | undefined>();
  const getCustomHealthChecks = useGetHealthChecksWithTimestamps({
    serialNumber,
    start: time ? Math.floor(time.start.getTime() / 1000) : undefined,
    end: time ? Math.floor(time.end.getTime() / 1000) : undefined,
  });

  const dateCell = React.useCallback(
    (v: number) => (
      <Box>
        <FormattedDate date={v} />
      </Box>
    ),
    [],
  );
  const sanityCell = React.useCallback((v: number) => {
    let colorScheme = 'red';
    if (v === 100) colorScheme = 'green';
    else if (v >= 80) colorScheme = 'yellow';

    return (
      <Badge colorScheme={colorScheme} variant="solid">
        {v}
      </Badge>
    );
  }, []);
  const jsonCell = (health: HealthCheck) => <IconButton aria-label="Open Health Details" colorScheme="blue" size="xs"
    icon={<MagnifyingGlass size={16} />} onClick={() => { setSelectedHealth(health); modalProps.onOpen(); }} />;

  const columns: Column<HealthCheck>[] = React.useMemo(
    (): Column<HealthCheck>[] => [
      {
        id: 'submitted',
        Header: t('common.submitted'),
        Footer: '',
        accessor: 'submitted',
        Cell: (v) => dateCell(v.cell.row.original.recorded),
        customWidth: '35px',
        disableSortBy: true,
      },
      {
        id: 'UUID',
        Header: t('controller.devices.config_id'),
        Footer: '',
        accessor: 'UUID',
        customWidth: '35px',
        alwaysShow: true,
        disableSortBy: true,
      },
      {
        id: 'sanity',
        Header: t('devices.sanity'),
        Footer: '',
        accessor: 'sanity',
        Cell: (v) => sanityCell(v.cell.row.original.sanity),
        customWidth: '35px',
        disableSortBy: true,
      },
      {
        id: 'values',
        Header: t('common.details'),
        Footer: '',
        accessor: 'values',
        Cell: (v) => jsonCell(v.cell.row.original),
        customWidth: '35px',
        disableSortBy: true,
      },
    ],
    [t],
  );

  return {
    columns,
    getHealthChecks,
    getCustomHealthChecks,
    time,
    setTime,
    modal: <HealthDetailsModal health={selectedHealth} isOpen={modalProps.isOpen} onClose={modalProps.onClose} />,
  };
};

export default useHealthCheckTable;
