import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getAllBetRecords } from '@/src/services/db/crud';
import { calcStatsByBetType, type GroupStats } from '@/src/utils/stats';

export const useBetTypeStats = () => {
  const [stats, setStats] = useState<GroupStats[]>([]);

  useFocusEffect(useCallback(() => {
    load();
  }, []));

  const load = async () => {
    const records = await getAllBetRecords();
    setStats(calcStatsByBetType(records));
  };

  return stats;
};
