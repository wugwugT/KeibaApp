import { useMemo } from 'react';
import type { BetRecord } from '@/src/types/betRecord';
import { calcCumulativeProfit, type CumulativePoint } from '@/src/utils/stats';

export const useCumulativeProfit = (records: BetRecord[]): CumulativePoint[] => {
  return useMemo(() => calcCumulativeProfit(records), [records]);
};
