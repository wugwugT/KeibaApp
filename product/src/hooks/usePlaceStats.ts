import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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

  useFocusEffect(useCallback(() => {
    load();
  }, []));

  const load = async () => {
    const records = await getAllBetRecords();
    setStats(calcStatsByPlace(records));
  };

  return stats;
};
