import { useEffect, useState } from 'react';
import { getAllBetRecords } from '@/src/services/db/crud';
import { calcStatsByBetType, type GroupStats } from '@/src/utils/stats';

export const useBetTypeStats = () => {
  const [stats, setStats] = useState<GroupStats[]>([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const records = await getAllBetRecords();
    setStats(calcStatsByBetType(records));
  };

  return stats;
};
