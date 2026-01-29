import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { usePlaceStats } from '@/src/hooks/usePlaceStats';
import { useBetTypeStats } from '@/src/hooks/useBetTypeStats';
import { useRaceNoStats } from '@/src/hooks/useRaceNoStats';
import { useDailyTrend } from '@/src/hooks/useDailyTrend';
import { useCumulativeProfit } from '@/src/hooks/useCumulativeProfit';
import { useBestWorst } from '@/src/hooks/useBestWorst';

import { PlaceBarChart } from '@/src/components/analysis/PlaceBarChart';
import { CumulativeLineChart } from '@/src/components/analysis/CumulativeLineChart';

type Mode = 'place' | 'betType' | 'raceNo' | 'trend' | 'cumulative';

type Row = {
  key: string;
  investment: number;
  return: number;
  profit: number;
  recoveryRate: number;
};

type TrendRow = {
  date: string;
  investment: number;
  return: number;
  profit: number;
  recoveryRate: number;
};

type CumulativeRow = {
  date: string;
  dailyProfit: number;
  cumulativeProfit: number;
};

export const Analysis = () => {
  const [mode, setMode] = useState<Mode>('place');

  const placeStats = usePlaceStats();
  const betTypeStats = useBetTypeStats();
  const raceNoStats = useRaceNoStats();
  const dailyTrend = useDailyTrend();
  const cumulative = useCumulativeProfit();

  // ✅ ANA-006
  const { best, worst } = useBestWorst();

  const data: Row[] = useMemo(() => {
    if (mode === 'trend' || mode === 'cumulative') return [];

    const raw: Row[] =
      mode === 'place'
        ? placeStats.map((p) => ({
            key: p.place,
            investment: p.investment,
            return: p.return,
            profit: p.profit,
            recoveryRate: p.recoveryRate,
          }))
        : mode === 'betType'
        ? betTypeStats
        : raceNoStats;

    // R番だけは 1R→12R の固定順
    if (mode === 'raceNo') {
      return [...raw].sort((a, b) => {
        const ra = parseInt(a.key.replace('R', ''), 10);
        const rb = parseInt(b.key.replace('R', ''), 10);
        const aVal = Number.isFinite(ra) ? ra : 999;
        const bVal = Number.isFinite(rb) ? rb : 999;
        return aVal - bVal;
      });
    }

    // 競馬場・式別は回収率順
    return [...raw].sort((a, b) => b.recoveryRate - a.recoveryRate);
  }, [mode, placeStats, betTypeStats, raceNoStats]);

  const trend: TrendRow[] = useMemo(() => {
    if (mode !== 'trend') return [];
    // ✅ 新しい日付が上に来る（降順）
    return [...dailyTrend].sort((a, b) => {
      if (a.date < b.date) return 1;
      if (a.date > b.date) return -1;
      return 0;
    });
  }, [mode, dailyTrend]);

  const cumulativeRows: CumulativeRow[] = useMemo(() => {
    if (mode !== 'cumulative') return [];
    // useCumulativeProfit 側は日付昇順の想定なので、表示は降順にする
    return [...cumulative].sort((a, b) => {
      if (a.date < b.date) return 1;
      if (a.date > b.date) return -1;
      return 0;
    });
  }, [mode, cumulative]);

  const isEmpty =
    mode === 'trend'
      ? trend.length === 0
      : mode === 'cumulative'
      ? cumulativeRows.length === 0
      : data.length === 0;

  if (isEmpty) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>データがありません</ThemedText>
      </ThemedView>
    );
  }

  const headerTitle =
    mode === 'place'
      ? '競馬場別 回収率'
      : mode === 'betType'
      ? '式別 回収率'
      : mode === 'raceNo'
      ? 'R番別 回収率'
      : mode === 'trend'
      ? '日別トレンド'
      : '累積収支';

  // トレンドバー用の最大値（見た目スケール）
  const trendMaxAbsProfit = useMemo(() => {
    if (mode !== 'trend') return 1;
    return Math.max(...trend.map((t) => Math.abs(t.profit)), 1);
  }, [mode, trend]);

  const Segment = (
    <View style={styles.segment}>
      <TouchableOpacity
        onPress={() => setMode('place')}
        style={[styles.segBtn, mode === 'place' && styles.segActive]}>
        <ThemedText>競馬場</ThemedText>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setMode('betType')}
        style={[styles.segBtn, mode === 'betType' && styles.segActive]}>
        <ThemedText>式別</ThemedText>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setMode('raceNo')}
        style={[styles.segBtn, mode === 'raceNo' && styles.segActive]}>
        <ThemedText>R番</ThemedText>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setMode('trend')}
        style={[styles.segBtn, mode === 'trend' && styles.segActive]}>
        <ThemedText>日別</ThemedText>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setMode('cumulative')}
        style={[styles.segBtn, mode === 'cumulative' && styles.segActive]}>
        <ThemedText>累積</ThemedText>
      </TouchableOpacity>
    </View>
  );

  // ✅ ANA-006 表示ブロック（共通）
  const BestWorstBlock =
    best && worst ? (
      <ThemedView style={{ gap: 10 }}>
        <ThemedText type="subtitle">ベスト / ワースト（日別）</ThemedText>

        <ThemedView style={[styles.card, styles.bestCard]}>
          <ThemedText type="subtitle">🏆 ベスト</ThemedText>
          <ThemedText>{best.date}</ThemedText>
          <ThemedText style={{ color: '#4CAF50' }}>収支: +{best.profit}円</ThemedText>
          <ThemedText>回収率: {best.recoveryRate}%</ThemedText>
          <ThemedText>投資: {best.investment}円 / 回収: {best.return}円</ThemedText>
        </ThemedView>

        <ThemedView style={[styles.card, styles.worstCard]}>
          <ThemedText type="subtitle">💀 ワースト</ThemedText>
          <ThemedText>{worst.date}</ThemedText>
          <ThemedText style={{ color: '#F44336' }}>収支: {worst.profit}円</ThemedText>
          <ThemedText>回収率: {worst.recoveryRate}%</ThemedText>
          <ThemedText>投資: {worst.investment}円 / 回収: {worst.return}円</ThemedText>
        </ThemedView>
      </ThemedView>
    ) : null;

  // ===== 日別（ANA-004） =====
  if (mode === 'trend') {
    return (
      <FlatList
        data={trend}
        keyExtractor={(item) => item.date}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <ThemedView style={{ gap: 12 }}>
            <ThemedText type="title">Analysis</ThemedText>
            {Segment}
            {BestWorstBlock}

            <ThemedView style={styles.chartCard}>
              <ThemedText type="subtitle">{headerTitle}</ThemedText>
              <ThemedText style={{ opacity: 0.8 }}>
                日別の収支と回収率を確認できます
              </ThemedText>
            </ThemedView>
          </ThemedView>
        }
        renderItem={({ item }) => {
          const profitColor = item.profit >= 0 ? '#4CAF50' : '#F44336';
          const widthPct = Math.min(100, (Math.abs(item.profit) / trendMaxAbsProfit) * 100);

          return (
            <ThemedView style={styles.card}>
              <ThemedText type="subtitle">{item.date}</ThemedText>

              <View style={styles.trendBarBg}>
                <View
                  style={[
                    styles.trendBar,
                    { width: `${widthPct}%`, backgroundColor: profitColor },
                  ]}
                />
              </View>

              <ThemedText>投資: {item.investment}円</ThemedText>
              <ThemedText>回収: {item.return}円</ThemedText>
              <ThemedText style={{ color: profitColor }}>収支: {item.profit}円</ThemedText>
              <ThemedText>回収率: {item.recoveryRate}%</ThemedText>
            </ThemedView>
          );
        }}
      />
    );
  }

  // ===== 累積（ANA-005：折れ線） =====
  if (mode === 'cumulative') {
    return (
      <FlatList
        data={cumulativeRows}
        keyExtractor={(item) => item.date}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <ThemedView style={{ gap: 12 }}>
            <ThemedText type="title">Analysis</ThemedText>
            {Segment}
            {BestWorstBlock}

            <ThemedView style={styles.chartCard}>
              <ThemedText type="subtitle">{headerTitle}</ThemedText>
              <ThemedText style={{ opacity: 0.8 }}>
                日々の収支を積み上げた「累積収支」の推移です（折れ線）
              </ThemedText>
            </ThemedView>

            <CumulativeLineChart data={cumulativeRows} />
          </ThemedView>
        }
        renderItem={({ item }) => {
          const dailyColor = item.dailyProfit >= 0 ? '#4CAF50' : '#F44336';
          const cumColor = item.cumulativeProfit >= 0 ? '#4CAF50' : '#F44336';

          return (
            <ThemedView style={styles.card}>
              <ThemedText type="subtitle">{item.date}</ThemedText>
              <ThemedText style={{ color: dailyColor }}>日次収支: {item.dailyProfit}円</ThemedText>
              <ThemedText style={{ color: cumColor }}>累積収支: {item.cumulativeProfit}円</ThemedText>
            </ThemedView>
          );
        }}
      />
    );
  }

  // ===== place / betType / raceNo（既存） =====
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.key}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <ThemedView style={{ gap: 12 }}>
          <ThemedText type="title">Analysis</ThemedText>
          {Segment}
          {BestWorstBlock}

          <ThemedView style={styles.chartCard}>
            <ThemedText type="subtitle">{headerTitle}</ThemedText>
            <PlaceBarChart
              data={data.map((d) => ({
                place: d.key,
                investment: d.investment,
                return: d.return,
                profit: d.profit,
                recoveryRate: d.recoveryRate,
              }))}
            />
          </ThemedView>
        </ThemedView>
      }
      renderItem={({ item }) => {
        const profitColor = item.profit >= 0 ? '#4CAF50' : '#F44336';
        return (
          <ThemedView style={styles.card}>
            <ThemedText type="subtitle">{item.key}</ThemedText>
            <ThemedText>投資: {item.investment}円</ThemedText>
            <ThemedText>回収: {item.return}円</ThemedText>
            <ThemedText style={{ color: profitColor }}>収支: {item.profit}円</ThemedText>
            <ThemedText>回収率: {item.recoveryRate}%</ThemedText>
          </ThemedView>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  card: { padding: 12, borderRadius: 12, marginTop: 12 },
  chartCard: { padding: 12, borderRadius: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  segment: { flexDirection: 'row', gap: 8 },
  segBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    opacity: 0.9,
  },
  segActive: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },

  trendBarBg: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    marginVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  trendBar: { height: 10, borderRadius: 999 },

  bestCard: {
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.6)',
  },
  worstCard: {
    borderWidth: 1,
    borderColor: 'rgba(244,67,54,0.6)',
  },
});
