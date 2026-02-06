import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  LayoutAnimation,
  Platform,
  StyleSheet,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
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
import { BetRecordCard } from '@/src/components/common/BetRecordCard';
import { getAllBetRecords } from '@/src/services/db/crud';
import type { BetRecord } from '@/src/types/betRecord';

// Android用にLayoutAnimationを有効化
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [allRecords, setAllRecords] = useState<BetRecord[]>([]);

  const router = useRouter();

  const placeStats = usePlaceStats();
  const betTypeStats = useBetTypeStats();
  const raceNoStats = useRaceNoStats();
  const dailyTrend = useDailyTrend();
  const cumulative = useCumulativeProfit();

  // ✅ ANA-006
  const { best, worst } = useBestWorst();

  // 全レコードを取得
  useFocusEffect(useCallback(() => {
    const load = async () => {
      const records = await getAllBetRecords();
      setAllRecords(records);
    };
    load();
  }, []));

  // カードタップ時の展開/折りたたみ
  const toggleExpand = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedKey((prev) => (prev === key ? null : key));
  };

  // 展開時に表示するレコードをフィルタリング
  const getFilteredRecords = (key: string): BetRecord[] => {
    if (mode === 'place') {
      return allRecords.filter((r) => r.place === key);
    }
    if (mode === 'betType') {
      return allRecords.filter((r) => r.bet_type === key);
    }
    if (mode === 'raceNo') {
      const raceNo = parseInt(key.replace('R', ''), 10);
      return allRecords.filter((r) => r.race_no === raceNo);
    }
    if (mode === 'trend') {
      // key は "YYYY-MM-DD" 形式
      return allRecords.filter((r) => {
        const dateStr = r.date.toISOString().split('T')[0];
        return dateStr === key;
      });
    }
    if (mode === 'cumulative') {
      // 累積モードでも日付でフィルター
      return allRecords.filter((r) => {
        const dateStr = r.date.toISOString().split('T')[0];
        return dateStr === key;
      });
    }
    return [];
  };

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

  // ✅ ANA-006 表示ブロック（角丸セクション化）
  const BestWorstBlock =
    best && worst ? (
      <ThemedView style={styles.sectionCard}>
        <ThemedText type="subtitle">ベスト / ワースト（日別）</ThemedText>

        <ThemedView style={[styles.innerCard, styles.bestCard]}>
          <ThemedText type="subtitle">🏆 ベスト</ThemedText>
          <ThemedText>{best.date}</ThemedText>
          <ThemedText style={{ color: '#4CAF50' }}>
            収支: +{best.profit}円
          </ThemedText>
          <ThemedText>回収率: {best.recoveryRate}%</ThemedText>
          <ThemedText>
            投資: {best.investment}円 / 回収: {best.return}円
          </ThemedText>
        </ThemedView>

        <ThemedView style={[styles.innerCard, styles.worstCard]}>
          <ThemedText type="subtitle">💀 ワースト</ThemedText>
          <ThemedText>{worst.date}</ThemedText>
          <ThemedText style={{ color: '#F44336' }}>
            収支: {worst.profit}円
          </ThemedText>
          <ThemedText>回収率: {worst.recoveryRate}%</ThemedText>
          <ThemedText>
            投資: {worst.investment}円 / 回収: {worst.return}円
          </ThemedText>
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
          // ✅ ここが「下敷きグレー面」：角丸にする
          <ThemedView style={styles.headerCard}>
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
          </ThemedView>
        }
        renderItem={({ item }) => {
          const profitColor = item.profit >= 0 ? '#4CAF50' : '#F44336';
          const widthPct = Math.min(
            100,
            (Math.abs(item.profit) / trendMaxAbsProfit) * 100
          );
          const isExpanded = expandedKey === item.date;
          const filteredRecords = isExpanded
            ? getFilteredRecords(item.date)
            : [];

          return (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => toggleExpand(item.date)}>
              <ThemedView style={styles.card}>
                <View style={styles.cardHeader}>
                  <ThemedText type="subtitle">{item.date}</ThemedText>
                  <ThemedText style={styles.expandIcon}>
                    {isExpanded ? '▲' : '▼'}
                  </ThemedText>
                </View>

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
                <ThemedText style={{ color: profitColor }}>
                  収支: {item.profit}円
                </ThemedText>
                <ThemedText>回収率: {item.recoveryRate}%</ThemedText>

                {isExpanded && (
                  <View style={styles.expandedContent}>
                    <ThemedText style={styles.recordsHeader}>
                      該当レコード ({filteredRecords.length}件)
                    </ThemedText>
                    {filteredRecords.map((record) => (
                      <BetRecordCard
                        key={record.id}
                        record={record}
                        onPress={() =>
                          router.push({
                            pathname: '/recordEdit',
                            params: { id: record.id },
                          })
                        }
                      />
                    ))}
                  </View>
                )}
              </ThemedView>
            </TouchableOpacity>
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
          // ✅ ここが「下敷きグレー面」：角丸にする
          <ThemedView style={styles.headerCard}>
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
          </ThemedView>
        }
        renderItem={({ item }) => {
          const dailyColor = item.dailyProfit >= 0 ? '#4CAF50' : '#F44336';
          const cumColor = item.cumulativeProfit >= 0 ? '#4CAF50' : '#F44336';
          const isExpanded = expandedKey === item.date;
          const filteredRecords = isExpanded
            ? getFilteredRecords(item.date)
            : [];

          return (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => toggleExpand(item.date)}>
              <ThemedView style={styles.card}>
                <View style={styles.cardHeader}>
                  <ThemedText type="subtitle">{item.date}</ThemedText>
                  <ThemedText style={styles.expandIcon}>
                    {isExpanded ? '▲' : '▼'}
                  </ThemedText>
                </View>
                <ThemedText style={{ color: dailyColor }}>
                  日次収支: {item.dailyProfit}円
                </ThemedText>
                <ThemedText style={{ color: cumColor }}>
                  累積収支: {item.cumulativeProfit}円
                </ThemedText>

                {isExpanded && (
                  <View style={styles.expandedContent}>
                    <ThemedText style={styles.recordsHeader}>
                      該当レコード ({filteredRecords.length}件)
                    </ThemedText>
                    {filteredRecords.map((record) => (
                      <BetRecordCard
                        key={record.id}
                        record={record}
                        onPress={() =>
                          router.push({
                            pathname: '/recordEdit',
                            params: { id: record.id },
                          })
                        }
                      />
                    ))}
                  </View>
                )}
              </ThemedView>
            </TouchableOpacity>
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
        // ✅ ここが「下敷きグレー面」：角丸にする
        <ThemedView style={styles.headerCard}>
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
        </ThemedView>
      }
      renderItem={({ item }) => {
        const profitColor = item.profit >= 0 ? '#4CAF50' : '#F44336';
        const isExpanded = expandedKey === item.key;
        const filteredRecords = isExpanded ? getFilteredRecords(item.key) : [];

        return (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => toggleExpand(item.key)}>
            <ThemedView style={styles.card}>
              <View style={styles.cardHeader}>
                <ThemedText type="subtitle">{item.key}</ThemedText>
                <ThemedText style={styles.expandIcon}>
                  {isExpanded ? '▲' : '▼'}
                </ThemedText>
              </View>
              <ThemedText>投資: {item.investment}円</ThemedText>
              <ThemedText>回収: {item.return}円</ThemedText>
              <ThemedText style={{ color: profitColor }}>
                収支: {item.profit}円
              </ThemedText>
              <ThemedText>回収率: {item.recoveryRate}%</ThemedText>

              {isExpanded && (
                <View style={styles.expandedContent}>
                  <ThemedText style={styles.recordsHeader}>
                    該当レコード ({filteredRecords.length}件)
                  </ThemedText>
                  {filteredRecords.map((record) => (
                    <BetRecordCard
                      key={record.id}
                      record={record}
                      onPress={() =>
                        router.push({
                          pathname: '/recordEdit',
                          params: { id: record.id },
                        })
                      }
                    />
                  ))}
                </View>
              )}
            </ThemedView>
          </TouchableOpacity>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  // ✅ FlatList全体の余白は従来通り（カード分離は維持）
  list: { padding: 16, gap: 12 },

  // ✅ 「Analysis〜グラフまでの下敷きグレー面」を角丸にする
  headerCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12, // 下のカードと分離
    padding: 16, // 下敷き面の内側余白
    // 仕上げに薄い枠が欲しければ有効化（好み）
    // borderWidth: 1,
    // borderColor: 'rgba(255,255,255,0.06)',
  },

  // リストの各行カード
  card: { padding: 12, borderRadius: 12 },

  // カードヘッダー（タイトル + 展開アイコン）
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },

  // 展開/折りたたみアイコン
  expandIcon: {
    fontSize: 12,
    opacity: 0.6,
  },

  // 展開時のコンテンツ領域
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },

  // 該当レコードのヘッダー
  recordsHeader: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
  },

  // 上部のチャート用カード
  chartCard: { padding: 12, borderRadius: 12 },

  // ✅ ベスト/ワースト全体を「角丸の大カード」にする
  sectionCard: {
    padding: 12,
    borderRadius: 16,
    overflow: 'hidden',
    gap: 10,
  },

  // セクション内の小カード
  innerCard: {
    padding: 12,
    borderRadius: 12,
  },

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
