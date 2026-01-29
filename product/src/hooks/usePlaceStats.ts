import { useEffect, useState } from 'react';
import { getAllBetRecords } from '@/src/services/db/crud';
import { calcStatsByPlace } from '@/src/utils/stats';

type PlaceStats = {
  place: string;
  investment: number;
  return: number;
  profit: number;
  recoveryRate: number;
};

export const usePlaceStats = () => {
  const [stats, setStats] = useState<PlaceStats[]>([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const records = await getAllBetRecords();
    setStats(calcStatsByPlace(records));
  };

  return stats;
};
