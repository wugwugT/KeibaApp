import { useMemo } from 'react';
import type { BetRecord } from '@/src/types/betRecord';
import { calcStatsByRaceNo, type GroupStats } from '@/src/utils/stats';

export const useRaceNoStats = (records: BetRecord[]): GroupStats[] => {
  return useMemo(() => calcStatsByRaceNo(records), [records]);
};
