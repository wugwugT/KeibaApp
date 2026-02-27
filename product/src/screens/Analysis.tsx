import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

import { usePlaceStats } from '@/src/hooks/usePlaceStats';
import { useBetTypeStats } from '@/src/hooks/useBetTypeStats';
import { useRaceNoStats } from '@/src/hooks/useRaceNoStats';
import { useDailyTrend } from '@/src/hooks/useDailyTrend';
import { useCumulativeProfit } from '@/src/hooks/useCumulativeProfit';
import { useBestWorst } from '@/src/hooks/useBestWorst';
import { useMonthlyStats, type MonthlyRow } from '@/src/hooks/useMonthlyStats';

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

type Mode = 'place' | 'betType' | 'raceNo' | 'trend' | 'cumulative' | 'monthly';

type Row = {
  key: string;
  investment: number;
  return: number;
  profit: number;
  recoveryRate: number;
  betCount: number;
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
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [mode, setMode] = useState<Mode>('place');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [allRecords, setAllRecords] = useState<BetRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();

  const MODES: Mode[] = ['place', 'betType', 'raceNo', 'trend', 'cumulative', 'monthly'];

  // ===== スライドアニメーション =====
  const slideAnim = useSharedValue(1);
  const slideDirection = useSharedValue(0); // 1=右から, -1=左から

  const slideStyle = useAnimatedStyle(() => ({
    opacity: slideAnim.value,
    transform: [
      { translateX: interpolate(slideAnim.value, [0, 1], [slideDirection.value * 50, 0]) },
    ],
  }));

  const changeTab = (next: Mode) => {
    const oldIdx = MODES.indexOf(mode);
    const newIdx = MODES.indexOf(next);
    slideDirection.value = newIdx > oldIdx ? 1 : -1;
    slideAnim.value = 0;
    setMode(next);
    setExpandedKey(null);
    slideAnim.value = withTiming(1, { duration: 250 });
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const goToNextTab = () => {
    const i = MODES.indexOf(mode);
    if (i < MODES.length - 1) changeTab(MODES[i + 1]);
  };

  const goToPrevTab = () => {
    const i = MODES.indexOf(mode);
    if (i > 0) changeTab(MODES[i - 1]);
  };

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-15, 15])
    .onEnd((event) => {
      if (event.translationX < -30) {
        runOnJS(goToNextTab)();
      } else if (event.translationX > 30) {
        runOnJS(goToPrevTab)();
      }
    });

  const placeStats = usePlaceStats(allRecords);
  const betTypeStats = useBetTypeStats(allRecords);
  const raceNoStats = useRaceNoStats(allRecords);
  const dailyTrend = useDailyTrend(allRecords);
  const cumulative = useCumulativeProfit(allRecords);
  const { best, worst, maxWinStreak, maxLoseStreak } = useBestWorst(allRecords);
  const monthlyStats = useMonthlyStats(allRecords);

  // 全レコードを取得
  useFocusEffect(useCallback(() => {
    const load = async () => {
      setIsLoading(true);
      const records = await getAllBetRecords();
      setAllRecords(records);
      setIsLoading(false);
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
      return allRecords.filter((r) => {
        const dateStr = r.date.toISOString().split('T')[0];
        return dateStr === key;
      });
    }
    if (mode === 'cumulative') {
      return allRecords.filter((r) => {
        const dateStr = r.date.toISOString().split('T')[0];
        return dateStr === key;
      });
    }
    if (mode === 'monthly') {
      return allRecords.filter((r) => {
        const d = r.date instanceof Date ? r.date : new Date(r.date);
        const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return month === key;
      });
    }
    return [];
  };

  const data: Row[] = useMemo(() => {
    if (mode === 'trend' || mode === 'cumulative' || mode === 'monthly') return [];

    const raw: Row[] =
      mode === 'place'
        ? placeStats.map((p) => ({
            key: p.place,
            investment: p.investment,
            return: p.return,
            profit: p.profit,
            recoveryRate: p.recoveryRate,
            betCount: p.betCount,
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
    return [...dailyTrend].sort((a, b) => {
      if (a.date < b.date) return 1;
      if (a.date > b.date) return -1;
      return 0;
    });
  }, [mode, dailyTrend]);

  const cumulativeRows: CumulativeRow[] = useMemo(() => {
    if (mode !== 'cumulative') return [];
    return [...cumulative].sort((a, b) => {
      if (a.date < b.date) return 1;
      if (a.date > b.date) return -1;
      return 0;
    });
  }, [mode, cumulative]);

  const monthlyRows: MonthlyRow[] = useMemo(() => {
    if (mode !== 'monthly') return [];
    return [...monthlyStats].sort((a, b) => {
      if (a.month < b.month) return 1;
      if (a.month > b.month) return -1;
      return 0;
    });
  }, [mode, monthlyStats]);

  // トレンドバー用の最大値（見た目スケール）
  const trendMaxAbsProfit = useMemo(() => {
    if (mode !== 'trend') return 1;
    return Math.max(...trend.map((t) => Math.abs(t.profit)), 1);
  }, [mode, trend]);

  // ローディング表示
  if (isLoading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  const isEmpty =
    mode === 'trend'
      ? trend.length === 0
      : mode === 'cumulative'
      ? cumulativeRows.length === 0
      : mode === 'monthly'
      ? monthlyRows.length === 0
      : data.length === 0;

  if (isEmpty) {
    return (
      <ThemedView style={styles.center}>
        <Ionicons name="bar-chart-outline" size={48} color={c.text} />
        <ThemedText style={{ fontSize: 18, fontWeight: '600', marginTop: 8 }}>
          データがありません
        </ThemedText>
        <ThemedText style={{ opacity: 0.6, textAlign: 'center', marginTop: 4 }}>
          馬券を追加すると分析結果が表示されます
        </ThemedText>
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
      : mode === 'cumulative'
      ? '累積収支'
      : '月別集計';

  const segmentLabels: Record<Mode, string> = {
    place: '競馬場',
    betType: '式別',
    raceNo: 'R番',
    trend: '日別',
    cumulative: '累積',
    monthly: '月別',
  };

  const Segment = (
    <View style={styles.segment}>
      {MODES.map((m) => (
        <TouchableOpacity
          key={m}
          onPress={() => setMode(m)}
          style={[
            styles.segBtn,
            { backgroundColor: mode === m ? c.segmentActive : c.segmentInactive },
          ]}
          accessibilityLabel={`${segmentLabels[m]}タブ`}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === m }}
        >
          <ThemedText style={mode === m ? { color: c.segmentActiveText } : undefined}>
            {segmentLabels[m]}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );

  const BestWorstBlock =
    best && worst ? (
      <ThemedView style={styles.sectionCard}>
        <ThemedText type="subtitle">ベスト / ワースト（日別）</ThemedText>

        <ThemedView style={[styles.innerCard, styles.bestCard, { borderColor: c.profit + '40' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="trophy" size={20} color={c.profit} />
            <ThemedText type="subtitle">ベスト</ThemedText>
          </View>
          <ThemedText>{best.date}</ThemedText>
          <ThemedText style={{ color: c.profit }}>
            収支: +{best.profit}円
          </ThemedText>
          <ThemedText>回収率: {best.recoveryRate}%</ThemedText>
          <ThemedText>
            投資: {best.investment}円 / 回収: {best.return}円
          </ThemedText>
        </ThemedView>

        <ThemedView style={[styles.innerCard, styles.worstCard, { borderColor: c.loss + '40' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="skull-outline" size={20} color={c.loss} />
            <ThemedText type="subtitle">ワースト</ThemedText>
          </View>
          <ThemedText>{worst.date}</ThemedText>
          <ThemedText style={{ color: c.loss }}>
            収支: {worst.profit}円
          </ThemedText>
          <ThemedText>回収率: {worst.recoveryRate}%</ThemedText>
          <ThemedText>
            投資: {worst.investment}円 / 回収: {worst.return}円
          </ThemedText>
        </ThemedView>

        <ThemedView style={[styles.innerCard, styles.streakCard, { borderColor: c.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="flame" size={16} color={c.profit} />
            <ThemedText>最長連勝: {maxWinStreak}日</ThemedText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <Ionicons name="skull-outline" size={16} color={c.loss} />
            <ThemedText>最長連敗: {maxLoseStreak}日</ThemedText>
          </View>
        </ThemedView>
      </ThemedView>
    ) : null;

  // ===== 月別 =====
  if (mode === 'monthly') {
    return (
      <GestureDetector gesture={swipeGesture}>
      <Animated.FlatList
        style={slideStyle}
        data={monthlyRows}
        keyExtractor={(item) => item.month}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <ThemedView style={styles.headerCard}>
            <ThemedView style={{ gap: 12 }}>
              <ThemedText type="title">Analysis</ThemedText>
              {Segment}
              {BestWorstBlock}

              <ThemedView style={styles.chartCard}>
                <ThemedText type="subtitle">{headerTitle}</ThemedText>
                <ThemedText style={{ opacity: 0.8 }}>
                  月ごとの収支をまとめて確認できます
                </ThemedText>
              </ThemedView>
            </ThemedView>
          </ThemedView>
        }
        renderItem={({ item }) => {
          const profitColor = item.profit >= 0 ? c.profit : c.loss;
          const isExpanded = expandedKey === item.month;
          const filteredRecords = isExpanded
            ? getFilteredRecords(item.month)
            : [];

          return (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => toggleExpand(item.month)}>
              <ThemedView style={styles.card}>
                <View style={styles.cardHeader}>
                  <ThemedText type="subtitle">{item.month}</ThemedText>
                  <ThemedText style={styles.expandIcon}>
                    {isExpanded ? '▲' : '▼'}
                  </ThemedText>
                </View>
                <ThemedText>投資: {item.investment}円</ThemedText>
                <ThemedText>回収: {item.return}円</ThemedText>
                <ThemedText
                  style={{ color: profitColor }}
                  accessibilityLabel={`収支 ${item.profit >= 0 ? 'プラス' : 'マイナス'} ${Math.abs(item.profit)}円`}
                >
                  収支: {item.profit}円
                </ThemedText>
                <ThemedText>回収率: {item.recoveryRate}%</ThemedText>
                <ThemedText style={{ opacity: 0.6 }}>
                  ({item.betCount}回)
                </ThemedText>

                {isExpanded && (
                  <View style={[styles.expandedContent, { borderTopColor: c.border }]}>
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
      </GestureDetector>
    );
  }

  // ===== 日別（ANA-004） =====
  if (mode === 'trend') {
    return (
      <GestureDetector gesture={swipeGesture}>
      <Animated.FlatList
        style={slideStyle}
        data={trend}
        keyExtractor={(item) => item.date}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
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
          const profitColor = item.profit >= 0 ? c.profit : c.loss;
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

                <View style={[styles.trendBarBg, { backgroundColor: c.subtle }]}>
                  <View
                    style={[
                      styles.trendBar,
                      { width: `${widthPct}%`, backgroundColor: profitColor },
                    ]}
                  />
                </View>

                <ThemedText>投資: {item.investment}円</ThemedText>
                <ThemedText>回収: {item.return}円</ThemedText>
                <ThemedText
                  style={{ color: profitColor }}
                  accessibilityLabel={`収支 ${item.profit >= 0 ? 'プラス' : 'マイナス'} ${Math.abs(item.profit)}円`}
                >
                  収支: {item.profit}円
                </ThemedText>
                <ThemedText>回収率: {item.recoveryRate}%</ThemedText>

                {isExpanded && (
                  <View style={[styles.expandedContent, { borderTopColor: c.border }]}>
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
      </GestureDetector>
    );
  }

  // ===== 累積（ANA-005：折れ線） =====
  if (mode === 'cumulative') {
    return (
      <GestureDetector gesture={swipeGesture}>
      <Animated.FlatList
        style={slideStyle}
        data={cumulativeRows}
        keyExtractor={(item) => item.date}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
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
          const dailyColor = item.dailyProfit >= 0 ? c.profit : c.loss;
          const cumColor = item.cumulativeProfit >= 0 ? c.profit : c.loss;
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
                  <View style={[styles.expandedContent, { borderTopColor: c.border }]}>
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
      </GestureDetector>
    );
  }

  // ===== place / betType / raceNo（既存） =====
  return (
    <GestureDetector gesture={swipeGesture}>
    <Animated.FlatList
      style={slideStyle}
      data={data}
      keyExtractor={(item) => item.key}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
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
        const profitColor = item.profit >= 0 ? c.profit : c.loss;
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
              <ThemedText
                style={{ color: profitColor }}
                accessibilityLabel={`収支 ${item.profit >= 0 ? 'プラス' : 'マイナス'} ${Math.abs(item.profit)}円`}
              >
                収支: {item.profit}円
              </ThemedText>
              <ThemedText>回収率: {item.recoveryRate}%</ThemedText>
              <ThemedText style={{ opacity: 0.6 }}>
                ({item.betCount}回)
              </ThemedText>

              {isExpanded && (
                <View style={[styles.expandedContent, { borderTopColor: c.border }]}>
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
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },

  headerCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
    padding: 16,
  },

  card: { padding: 12, borderRadius: 12 },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },

  expandIcon: {
    fontSize: 12,
    opacity: 0.6,
  },

  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },

  recordsHeader: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
  },

  chartCard: { padding: 12, borderRadius: 12 },

  sectionCard: {
    padding: 12,
    borderRadius: 16,
    overflow: 'hidden',
    gap: 10,
  },

  innerCard: {
    padding: 12,
    borderRadius: 12,
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  segment: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  segBtn: {
    flex: 1,
    minWidth: 50,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    opacity: 0.9,
  },
  trendBarBg: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    marginVertical: 8,
  },
  trendBar: { height: 10, borderRadius: 999 },

  bestCard: {
    borderWidth: 1,
  },
  worstCard: {
    borderWidth: 1,
  },
  streakCard: {
    borderWidth: 1,
  },
});
