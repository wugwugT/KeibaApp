import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getAllBetRecords } from '@/src/services/db/crud';
import { calcStatsByRaceNo, type GroupStats } from '@/src/utils/stats';

export const useRaceNoStats = () => {
  const [stats, setStats] = useState<GroupStats[]>([]);

  useFocusEffect(useCallback(() => {
    load();
  }, []));

  const load = async () => {
    const records = await getAllBetRecords();
    setStats(calcStatsByRaceNo(records));
  };

  return stats;
};
