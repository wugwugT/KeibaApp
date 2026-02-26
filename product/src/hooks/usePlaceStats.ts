import { useMemo } from 'react';
import type { BetRecord } from '@/src/types/betRecord';
import { calcStatsByPlace } from '@/src/utils/stats';

export const usePlaceStats = (records: BetRecord[]) => {
  return useMemo(() => calcStatsByPlace(records), [records]);
};
