import { useMemo } from 'react';
import type { BetRecord } from '@/src/types/betRecord';
import { calcDailyTrend } from '@/src/utils/stats';

export const useBestWorst = (records: BetRecord[]) => {
  return useMemo(() => {
    const daily = calcDailyTrend(records);

    if (daily.length === 0) {
      return { best: null, worst: null, maxWinStreak: 0, maxLoseStreak: 0 };
    }

    let best = daily[0];
    let worst = daily[0];

    for (const d of daily) {
      if (d.profit > best.profit) best = d;
      if (d.profit < worst.profit) worst = d;
    }

    // 連勝/連敗（日別）: 日付昇順でソート済み（calcDailyTrendは昇順）
    let maxWinStreak = 0;
    let maxLoseStreak = 0;
    let curWin = 0;
    let curLose = 0;

    for (const d of daily) {
      if (d.profit > 0) {
        curWin += 1;
        curLose = 0;
      } else if (d.profit < 0) {
        curLose += 1;
        curWin = 0;
      } else {
        // profit === 0 はストリークをリセット
        curWin = 0;
        curLose = 0;
      }
      if (curWin > maxWinStreak) maxWinStreak = curWin;
      if (curLose > maxLoseStreak) maxLoseStreak = curLose;
    }

    return { best, worst, maxWinStreak, maxLoseStreak };
  }, [records]);
};
