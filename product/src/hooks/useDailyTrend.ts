import { useMemo } from 'react';
import type { BetRecord } from '@/src/types/betRecord';
import { calcDailyTrend, type TrendPoint } from '@/src/utils/stats';

export const useDailyTrend = (records: BetRecord[]): TrendPoint[] => {
  return useMemo(() => calcDailyTrend(records), [records]);
};
