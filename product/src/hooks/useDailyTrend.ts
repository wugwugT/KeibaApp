import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getAllBetRecords } from '@/src/services/db/crud';
import { calcDailyTrend, type TrendPoint } from '@/src/utils/stats';

export const useDailyTrend = () => {
  const [trend, setTrend] = useState<TrendPoint[]>([]);

  useFocusEffect(useCallback(() => {
    load();
  }, []));

  const load = async () => {
    const records = await getAllBetRecords();
    setTrend(calcDailyTrend(records));
  };

  return trend;
};
