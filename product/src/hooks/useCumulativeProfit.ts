import { useEffect, useState } from 'react';
import { getAllBetRecords } from '@/src/services/db/crud';
import { calcCumulativeProfit, type CumulativePoint } from '@/src/utils/stats';

export const useCumulativeProfit = () => {
  const [points, setPoints] = useState<CumulativePoint[]>([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const records = await getAllBetRecords();
    setPoints(calcCumulativeProfit(records));
  };

  return points;
};
