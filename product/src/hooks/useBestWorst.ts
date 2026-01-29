import { useMemo } from 'react';
import { useDailyTrend } from '@/src/hooks/useDailyTrend';

export const useBestWorst = () => {
  const daily = useDailyTrend();

  return useMemo(() => {
    if (daily.length === 0) {
      return { best: null, worst: null };
    }

    let best = daily[0];
    let worst = daily[0];

    for (const d of daily) {
      if (d.profit > best.profit) best = d;
      if (d.profit < worst.profit) worst = d;
    }

    return { best, worst };
  }, [daily]);
};
