import { useMemo } from 'react';
import type { BetRecord } from '@/src/types/betRecord';

type MonthlyRow = {
  month: string;
  investment: number;
  return: number;
  profit: number;
  recoveryRate: number;
  betCount: number;
};

export type { MonthlyRow };

export const useMonthlyStats = (records: BetRecord[]): MonthlyRow[] => {
  return useMemo(() => {
    const map = new Map<string, { inv: number; ret: number; count: number }>();
    records.forEach((r) => {
      const d = r.date instanceof Date ? r.date : new Date(r.date);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const cur = map.get(month) ?? { inv: 0, ret: 0, count: 0 };
      cur.inv += r.investment;
      cur.ret += r.return;
      cur.count += 1;
      map.set(month, cur);
    });
    return [...map.entries()].map(([month, v]) => ({
      month,
      investment: v.inv,
      return: v.ret,
      profit: v.ret - v.inv,
      recoveryRate: v.inv > 0 ? Math.round((v.ret / v.inv) * 100) : 0,
      betCount: v.count,
    }));
  }, [records]);
};
