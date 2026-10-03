import { useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosGw } from 'constants/axiosInstances';
import { RebootRequirement, readRebootRequirement, mergeRebootRequirement } from 'helpers/radioTopology';

export const useRadioTopology = (serialNumber: string, enabled: boolean) => {
  const client = useQueryClient();
  const key = ['reboot-requirement', serialNumber];
  return useQuery<RebootRequirement | null>(key, async () => {
    const { data } = await axiosGw.get(`device/${encodeURIComponent(serialNumber)}/statistics?newest=true&limit=1`);
    const previous = client.getQueryData<RebootRequirement | null>(key) ?? undefined;
    return mergeRebootRequirement(previous, readRebootRequirement(data.data?.[0])) ?? null;
  }, { enabled, staleTime: 15000, refetchInterval: 30000, retry: 1 });
};
