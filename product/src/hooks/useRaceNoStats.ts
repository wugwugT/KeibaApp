import { useEffect, useState } from 'react';
import { getAllBetRecords } from '@/src/services/db/crud';
import { calcStatsByRaceNo, type GroupStats } from '@/src/utils/stats';

export const useRaceNoStats = () => {
  const [stats, setStats] = useState<GroupStats[]>([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const records = await getAllBetRecords();
    setStats(calcStatsByRaceNo(records));
  };

  return stats;
};
