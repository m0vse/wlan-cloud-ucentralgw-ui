import { useQuery } from '@tanstack/react-query';
import { axiosGw, axiosProv, axiosSec } from 'constants/axiosInstances';
import { useAuth } from 'contexts/AuthProvider';

export type EndpointApiResponse = {
  authenticationType: string;
  id: number;
  type: string;
  uri: string;
  vendor: string;
};

export const useGetEndpoints = ({ onSuccess }: { onSuccess: (data: EndpointApiResponse[]) => void }) =>
  useQuery(
    ['get-endpoints'],
    () =>
      axiosSec
        .get('systemEndpoints')
        .then(({ data }: { data: { endpoints: EndpointApiResponse[] } }) => data.endpoints),
    {
      enabled: false,
      staleTime: Infinity,
      onSuccess,
    },
  );

export const useGetGatewayUi = () => {
  const { user } = useAuth();
  return useQuery(['get-gw-ui'], () => axiosGw.get('system?command=info').then(({ data }) => data.UI), {
    enabled: user?.userRole === 'root',
    staleTime: Infinity,
  });
};
export const useGetProvUi = () => {
  const { user } = useAuth();
  return useQuery(['provisioning', 'ui'], () => axiosProv.get('system?command=info').then(({ data }) => data.UI as string), {
    enabled: user?.userRole === 'root',
    staleTime: Infinity,
  });
};
