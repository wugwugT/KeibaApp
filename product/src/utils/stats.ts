import { BetRecord } from '@/src/types/betRecord';

export type GroupStats = {
  key: string; // place or bet_type or race_no
  investment: number;
  return: number;
  profit: number;
  recoveryRate: number; // %
  betCount: number;
};

const toStats = (key: string, investment: number, ret: number, count: number): GroupStats => {
  const profit = ret - investment;
  const recoveryRate = investment === 0 ? 0 : Math.round((ret / investment) * 100);
  return { key, investment, return: ret, profit, recoveryRate, betCount: count };
};

// 既存：競馬場別（ANA-001）
// ※この関数は PlaceStats っぽい返し（placeキー）なのでそのまま維持
export const calcStatsByPlace = (records: BetRecord[]) => {
  const map: Record<string, { investment: number; return: number; count: number }> = {};
  records.forEach((r) => {
    map[r.place] ??= { investment: 0, return: 0, count: 0 };
    map[r.place].investment += r.investment;
    map[r.place].return += r.return;
    map[r.place].count += 1;
  });
  return Object.entries(map).map(([place, v]) => ({
    place,
    investment: v.investment,
    return: v.return,
    profit: v.return - v.investment,
    recoveryRate: v.investment === 0 ? 0 : Math.round((v.return / v.investment) * 100),
    betCount: v.count,
  }));
};

// ✅ ANA-002：式別分析
export const calcStatsByBetType = (records: BetRecord[]): GroupStats[] => {
  const map: Record<string, { investment: number; return: number; count: number }> = {};

  records.forEach((r) => {
    const key = r.bet_type || '未設定';
    map[key] ??= { investment: 0, return: 0, count: 0 };
    map[key].investment += r.investment;
    map[key].return += r.return;
    map[key].count += 1;
  });

  return Object.entries(map).map(([key, v]) => toStats(key, v.investment, v.return, v.count));
};

// ✅ ANA-003：レース番号別分析（1R〜12R）
export const calcStatsByRaceNo = (records: BetRecord[]): GroupStats[] => {
  const map: Record<string, { investment: number; return: number; count: number }> = {};

  records.forEach((r) => {
    // race_no が不正/未設定でも落ちないように保険
    const rn =
      typeof r.race_no === 'number' && Number.isFinite(r.race_no) ? r.race_no : 0;

    const key = rn > 0 ? `${rn}R` : '未設定';
    map[key] ??= { investment: 0, return: 0, count: 0 };
    map[key].investment += r.investment;
    map[key].return += r.return;
    map[key].count += 1;
  });

  return Object.entries(map).map(([key, v]) => toStats(key, v.investment, v.return, v.count));
};

export type TrendPoint = {
  date: string; // YYYY-MM-DD
  investment: number;
  return: number;
  profit: number;
  recoveryRate: number; // %
};

// Date or string の両対応（record.date が Date でも string でも落ちないように）
const toYMD = (d: unknown): string => {
  if (d instanceof Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  if (typeof d === 'string') {
    // "2026-01-28" or ISO の先頭10桁想定
    return d.length >= 10 ? d.slice(0, 10) : d;
  }
  // 変な値が来たら「不明」に寄せる
  return 'unknown';
};

// ✅ ANA-004：日別トレンド（回収率/収支）
export const calcDailyTrend = (records: BetRecord[]): TrendPoint[] => {
  const map: Record<string, { investment: number; return: number }> = {};

  records.forEach((r) => {
    const key = toYMD((r as any).date);
    map[key] ??= { investment: 0, return: 0 };
    map[key].investment += r.investment;
    map[key].return += r.return;
  });

  return Object.entries(map)
    .map(([date, v]) => {
      const profit = v.return - v.investment;
      const recoveryRate = v.investment === 0 ? 0 : Math.round((v.return / v.investment) * 100);
      return { date, investment: v.investment, return: v.return, profit, recoveryRate };
    })
    .sort((a, b) => (a.date < b.date ? -1 : 1)); // 時系列順
};

export type CumulativePoint = {
  date: string; // YYYY-MM-DD
  dailyProfit: number; // その日の収支
  cumulativeProfit: number; // 累積収支
};

// ✅ ANA-005：累積収支推移（時系列の累積）
export const calcCumulativeProfit = (records: BetRecord[]): CumulativePoint[] => {
  // まず日別トレンド（昇順）を作る
  const daily = calcDailyTrend(records).sort((a, b) => (a.date < b.date ? -1 : 1));

  let cum = 0;
  return daily.map((d) => {
    cum += d.profit;
    return {
      date: d.date,
      dailyProfit: d.profit,
      cumulativeProfit: cum,
    };
  });
};
