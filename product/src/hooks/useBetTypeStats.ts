import { useMemo } from 'react';
import type { BetRecord } from '@/src/types/betRecord';
import { calcStatsByBetType, type GroupStats } from '@/src/utils/stats';

export const useBetTypeStats = (records: BetRecord[]): GroupStats[] => {
  return useMemo(() => calcStatsByBetType(records), [records]);
};
