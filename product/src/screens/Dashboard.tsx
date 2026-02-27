import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useTheme } from '@react-navigation/native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Camera } from 'expo-camera';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  interpolate,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';

import { BetRecord } from '../types/betRecord';
import { Colors } from '../../constants/theme';
import { getAllBetRecords, saveBetRecords } from '../services/db/crud';
import { BetRecordCard } from '../components/common/BetRecordCard';
import { extractJRAItemsFromQR, isValidQRData } from '../services/qr';
import { exportAsCSV } from '../services/export';
import { importFromCSV } from '../services/import';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const FAB_MENU_ITEMS = [
  { icon: 'qr-code-outline' as const, label: 'QRスキャン', key: 'qr' as const },
  { icon: 'create-outline' as const, label: '手動入力', key: 'manual' as const },
  { icon: 'cloud-upload-outline' as const, label: 'CSVエクスポート', key: 'export' as const },
  { icon: 'cloud-download-outline' as const, label: 'CSVインポート', key: 'import' as const },
];

type FilterType = 'all' | 'today' | 'month' | 'lastMonth' | 'custom';

const toYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const Dashboard = () => {
  const { colors, dark } = useTheme();

  const [records, setRecords] = useState<BetRecord[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);

  // ===== フィルタ スワイプ + スライドアニメーション =====
  const FILTERS: FilterType[] = ['all', 'today', 'month', 'lastMonth', 'custom'];
  const filterSlide = useSharedValue(1);
  const filterSlideDir = useSharedValue(0);

  const filterSlideStyle = useAnimatedStyle(() => ({
    opacity: filterSlide.value,
    transform: [
      { translateX: interpolate(filterSlide.value, [0, 1], [filterSlideDir.value * 50, 0]) },
    ],
  }));

  const changeFilter = (next: FilterType) => {
    const oldIdx = FILTERS.indexOf(filter);
    const newIdx = FILTERS.indexOf(next);
    if (oldIdx === newIdx) return;
    filterSlideDir.value = newIdx > oldIdx ? 1 : -1;
    filterSlide.value = 0;
    setFilter(next);
    setShowDatePicker(null);
    filterSlide.value = withTiming(1, { duration: 250 });
  };

  const goToNextFilter = () => {
    const i = FILTERS.indexOf(filter);
    if (i < FILTERS.length - 1) changeFilter(FILTERS[i + 1]);
  };

  const goToPrevFilter = () => {
    const i = FILTERS.indexOf(filter);
    if (i > 0) changeFilter(FILTERS[i - 1]);
  };

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-15, 15])
    .onEnd((event) => {
      if (event.translationX < -30) {
        runOnJS(goToNextFilter)();
      } else if (event.translationX > 30) {
        runOnJS(goToPrevFilter)();
      }
    });

  // ===== Speed Dial FAB =====
  const fabOpen = useSharedValue(0);

  const toggleFab = () => {
    const opening = fabOpen.value === 0;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fabOpen.value = withTiming(opening ? 1 : 0, { duration: 250 });
  };

  const closeFab = () => {
    fabOpen.value = withTiming(0, { duration: 200 });
  };

  const fabIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(fabOpen.value, [0, 1], [0, 45])}deg` }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: fabOpen.value,
    pointerEvents: fabOpen.value > 0.01 ? 'auto' as const : 'none' as const,
  }));

  const menuItemStyle0 = useAnimatedStyle(() => {
    const delay = (FAB_MENU_ITEMS.length - 1) * 50;
    return {
      opacity: withDelay(delay, withTiming(fabOpen.value, { duration: 200 })),
      transform: [
        { scale: withDelay(delay, withTiming(fabOpen.value, { duration: 200 })) },
        { translateY: withDelay(delay, withTiming(interpolate(fabOpen.value, [0, 1], [20, 0]), { duration: 200 })) },
      ],
    };
  });
  const menuItemStyle1 = useAnimatedStyle(() => {
    const delay = (FAB_MENU_ITEMS.length - 2) * 50;
    return {
      opacity: withDelay(delay, withTiming(fabOpen.value, { duration: 200 })),
      transform: [
        { scale: withDelay(delay, withTiming(fabOpen.value, { duration: 200 })) },
        { translateY: withDelay(delay, withTiming(interpolate(fabOpen.value, [0, 1], [20, 0]), { duration: 200 })) },
      ],
    };
  });
  const menuItemStyle2 = useAnimatedStyle(() => {
    const delay = (FAB_MENU_ITEMS.length - 3) * 50;
    return {
      opacity: withDelay(delay, withTiming(fabOpen.value, { duration: 200 })),
      transform: [
        { scale: withDelay(delay, withTiming(fabOpen.value, { duration: 200 })) },
        { translateY: withDelay(delay, withTiming(interpolate(fabOpen.value, [0, 1], [20, 0]), { duration: 200 })) },
      ],
    };
  });
  const menuItemStyle3 = useAnimatedStyle(() => {
    const delay = (FAB_MENU_ITEMS.length - 4) * 50;
    return {
      opacity: withDelay(delay, withTiming(fabOpen.value, { duration: 200 })),
      transform: [
        { scale: withDelay(delay, withTiming(fabOpen.value, { duration: 200 })) },
        { translateY: withDelay(delay, withTiming(interpolate(fabOpen.value, [0, 1], [20, 0]), { duration: 200 })) },
      ],
    };
  });
  const menuItemStyles = [menuItemStyle0, menuItemStyle1, menuItemStyle2, menuItemStyle3];

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadRecords();
    }, [])
  );

  const loadRecords = async () => {
    const data = await getAllBetRecords();
    setRecords(data);
    setIsLoading(false);
  };

  const handlePhotoQR = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (result.canceled) return;

    const uri = result.assets[0].uri;
    const barcodes = await Camera.scanFromURLAsync(uri, ['qr']);

    if (barcodes.length === 0) {
      Alert.alert('読み取り失敗', 'QRコードが見つかりませんでした');
      return;
    }

    const parsed = extractJRAItemsFromQR(barcodes[0].data);
    if (!isValidQRData(parsed)) {
      Alert.alert('読み取り失敗', 'JRAの馬券QRコードとして認識できませんでした');
      return;
    }

    router.push({
      pathname: '/recordEdit',
      params: { qr: JSON.stringify(parsed) },
    });
  };

  const handleImport = async () => {
    try {
      const inputs = await importFromCSV();
      if (inputs.length === 0) return;
      await saveBetRecords(inputs);
      Alert.alert('インポート完了', `${inputs.length}件のレコードをインポートしました`);
      loadRecords();
    } catch (e) {
      Alert.alert('エラー', 'インポートに失敗しました');
    }
  };

  const handleFabAction = (key: typeof FAB_MENU_ITEMS[number]['key']) => {
    closeFab();
    switch (key) {
      case 'qr':
        router.push('/scanner');
        break;
      case 'manual':
        router.push('/recordEdit');
        break;
      case 'export':
        exportAsCSV(filteredRecords);
        break;
      case 'import':
        handleImport();
        break;
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (filter === 'all') return true;

      const today = new Date();
      const recordDate = record.date;

      if (filter === 'today') {
        return (
          recordDate.getFullYear() === today.getFullYear() &&
          recordDate.getMonth() === today.getMonth() &&
          recordDate.getDate() === today.getDate()
        );
      }

      if (filter === 'month') {
        return (
          recordDate.getFullYear() === today.getFullYear() &&
          recordDate.getMonth() === today.getMonth()
        );
      }

      if (filter === 'lastMonth') {
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        return (
          recordDate.getFullYear() === lastMonth.getFullYear() &&
          recordDate.getMonth() === lastMonth.getMonth()
        );
      }

      if (filter === 'custom') {
        if (!customStart && !customEnd) return true;
        if (customStart) {
          const start = new Date(customStart.getFullYear(), customStart.getMonth(), customStart.getDate());
          if (recordDate < start) return false;
        }
        if (customEnd) {
          const end = new Date(customEnd.getFullYear(), customEnd.getMonth(), customEnd.getDate(), 23, 59, 59);
          if (recordDate > end) return false;
        }
        return true;
      }

      return true;
    });
  }, [records, filter, customStart, customEnd]);

  // ===== ANA-007: 統計サマリー =====
  const summary = useMemo(() => {
    const totalInvestment = filteredRecords.reduce((sum, r) => sum + r.investment, 0);
    const totalReturn = filteredRecords.reduce((sum, r) => sum + r.return, 0);
    const totalProfit = totalReturn - totalInvestment;

    const recoveryRate =
      totalInvestment === 0 ? 0 : Math.round((totalReturn / totalInvestment) * 100);

    const dayMap: Record<string, { investment: number; ret: number }> = {};
    for (const r of filteredRecords) {
      const key = toYMD(r.date);
      dayMap[key] ??= { investment: 0, ret: 0 };
      dayMap[key].investment += r.investment;
      dayMap[key].ret += r.return;
    }

    const days = Object.keys(dayMap).length;
    const dayProfits = Object.values(dayMap).map((v) => v.ret - v.investment);

    const winDays = dayProfits.filter((p) => p > 0).length;
    const winRate = days === 0 ? 0 : Math.round((winDays / days) * 100);

    const avgDailyProfit = days === 0 ? 0 : Math.round(totalProfit / days);

    return {
      totalInvestment,
      totalReturn,
      totalProfit,
      recoveryRate,
      winRate,
      avgDailyProfit,
      days,
    };
  }, [filteredRecords]);

  const s = dark ? 'dark' : 'light';
  const profitColor = summary.totalProfit >= 0 ? Colors[s].profit : Colors[s].loss;
  const avgColor = summary.avgDailyProfit >= 0 ? Colors[s].profit : Colors[s].loss;

  // ダーク/ライトで見やすい “カード内の薄い面” を自前で用意
  const subtleCard = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const chipBg = dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';
  const chipActiveBg = dark ? 'rgba(255,255,255,0.18)' : '#2c3e50';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <GestureDetector gesture={swipeGesture}>
      <Animated.FlatList
        style={filterSlideStyle}
        data={filteredRecords}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <BetRecordCard
            record={item}
            onPress={() =>
              router.push({
                pathname: '/recordEdit',
                params: { id: String(item.id) },
              })
            }
          />
        )}
        ListHeaderComponent={
          <>
            {/* ===== ANA-007: サマリー ===== */}
            <View
              style={[
                styles.summaryCard,
                {
                  backgroundColor: colors.card,
                  shadowColor: dark ? 'transparent' : '#000',
                },
              ]}
            >
              <Text style={[styles.summaryTitle, { color: colors.text }]}>
                収支サマリー
              </Text>

              <Text
                style={[styles.summaryProfit, { color: profitColor }]}
                accessibilityLabel={`収支 ${summary.totalProfit >= 0 ? 'プラス' : 'マイナス'} ${Math.abs(summary.totalProfit)}円`}
              >
                {summary.totalProfit >= 0 ? '+' : ''}
                {summary.totalProfit.toLocaleString()}円
              </Text>

              <View style={styles.summarySubRow}>
                <Text style={[styles.summarySubText, { color: colors.text }]}>
                  投資: {summary.totalInvestment.toLocaleString()}円
                </Text>
                <Text style={[styles.summarySubText, { color: colors.text }]}>
                  回収: {summary.totalReturn.toLocaleString()}円
                </Text>
              </View>

              <View style={styles.summaryGrid}>
                <View style={[styles.statCard, { backgroundColor: subtleCard }]}>
                  <Text style={[styles.statLabel, { color: colors.text }]}>回収率</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {summary.recoveryRate}%
                  </Text>
                </View>

                <View style={[styles.statCard, { backgroundColor: subtleCard }]}>
                  <Text style={[styles.statLabel, { color: colors.text }]}>勝率（日別）</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {summary.winRate}%
                  </Text>
                </View>

                <View style={[styles.statCard, { backgroundColor: subtleCard }]}>
                  <Text style={[styles.statLabel, { color: colors.text }]}>平均日次収支</Text>
                  <Text style={[styles.statValue, { color: avgColor }]}>
                    {summary.avgDailyProfit >= 0 ? '+' : ''}
                    {summary.avgDailyProfit.toLocaleString()}円
                  </Text>
                </View>

                <View style={[styles.statCard, { backgroundColor: subtleCard }]}>
                  <Text style={[styles.statLabel, { color: colors.text }]}>対象日数</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {summary.days}日
                  </Text>
                </View>
              </View>
            </View>

            {/* ===== フィルタ ===== */}
            <View style={styles.filterRow}>
              {(['all', 'today', 'month', 'lastMonth', 'custom'] as FilterType[]).map((key) => {
                const active = filter === key;
                const label =
                  key === 'all' ? '全期間' :
                  key === 'today' ? '今日' :
                  key === 'month' ? '今月' :
                  key === 'lastMonth' ? '先月' :
                  '期間指定';
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.filterButton,
                      { backgroundColor: active ? chipActiveBg : chipBg },
                    ]}
                    accessibilityLabel={`${label}フィルタ`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => changeFilter(key)}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        { color: active ? '#fff' : colors.text },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {filter === 'custom' && (
              <View style={styles.customDateRow}>
                <TouchableOpacity
                  style={[styles.dateInput, { backgroundColor: subtleCard, borderColor: showDatePicker === 'start' ? '#007AFF' : 'transparent' }]}
                  onPress={() => setShowDatePicker(showDatePicker === 'start' ? null : 'start')}
                >
                  <Text style={[styles.dateInputLabel, { color: colors.text }]}>開始日</Text>
                  <Text style={[styles.dateInputValue, { color: customStart ? colors.text : colors.text + '66' }]}>
                    {customStart
                      ? `${customStart.getFullYear()}/${String(customStart.getMonth() + 1).padStart(2, '0')}/${String(customStart.getDate()).padStart(2, '0')}`
                      : '未設定'}
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.dateSeparator, { color: colors.text }]}>〜</Text>
                <TouchableOpacity
                  style={[styles.dateInput, { backgroundColor: subtleCard, borderColor: showDatePicker === 'end' ? '#007AFF' : 'transparent' }]}
                  onPress={() => setShowDatePicker(showDatePicker === 'end' ? null : 'end')}
                >
                  <Text style={[styles.dateInputLabel, { color: colors.text }]}>終了日</Text>
                  <Text style={[styles.dateInputValue, { color: customEnd ? colors.text : colors.text + '66' }]}>
                    {customEnd
                      ? `${customEnd.getFullYear()}/${String(customEnd.getMonth() + 1).padStart(2, '0')}/${String(customEnd.getDate()).padStart(2, '0')}`
                      : '未設定'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                まだ記録がありません
              </Text>
              <Text style={[styles.emptyDesc, { color: colors.text }]}>
                右下の＋ボタンから馬券を追加してください
              </Text>
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: 120 }}
      />
      </GestureDetector>

      {/* ===== DateTimePicker ===== */}
      {showDatePicker && (
        <DateTimePicker
          value={
            showDatePicker === 'start'
              ? customStart ?? new Date()
              : customEnd ?? new Date()
          }
          mode="date"
          locale="ja"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selectedDate) => {
            if (Platform.OS === 'android') {
              setShowDatePicker(null);
            }
            if (!selectedDate) return;
            if (showDatePicker === 'start') {
              setCustomStart(selectedDate);
            } else {
              setCustomEnd(selectedDate);
            }
          }}
        />
      )}

      {/* ===== Speed Dial FAB ===== */}
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeFab} />
      </Animated.View>

      {FAB_MENU_ITEMS.map((item, index) => (
        <AnimatedPressable
          key={item.key}
          style={[
            styles.fabMenuItem,
            {
              bottom: 90 + index * 56,
              backgroundColor: dark ? 'rgba(40,40,40,0.95)' : 'rgba(255,255,255,0.95)',
              shadowColor: dark ? 'transparent' : '#000',
            },
            menuItemStyles[index],
          ]}
          onPress={() => handleFabAction(item.key)}
        >
          <Ionicons
            name={item.icon}
            size={20}
            color={dark ? '#fff' : '#1a1a1a'}
            style={styles.fabMenuIcon}
          />
          <Text style={[styles.fabMenuLabel, { color: dark ? '#fff' : '#1a1a1a' }]}>
            {item.label}
          </Text>
        </AnimatedPressable>
      ))}

      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: dark ? 'rgba(255,255,255,0.12)' : '#000' },
        ]}
        accessibilityLabel="メニューを開く"
        accessibilityRole="button"
        activeOpacity={0.8}
        onPress={toggleFab}
      >
        <Animated.Text style={[styles.fabText, { color: '#fff' }, fabIconStyle]}>
          ＋
        </Animated.Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  // ===== サマリー =====
  summaryCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  summaryProfit: {
    fontSize: 32,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  summarySubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 12,
  },
  summarySubText: {
    fontSize: 13,
    opacity: 0.8,
  },

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.75,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },

  // ===== フィルタ =====
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  filterText: {
    fontSize: 14,
  },
  customDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  dateInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 2,
  },
  dateInputLabel: {
    fontSize: 11,
    opacity: 0.6,
    marginBottom: 2,
  },
  dateInputValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  dateSeparator: {
    fontSize: 16,
    opacity: 0.5,
  },

  // ===== 空状態 =====
  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
  },

  // ===== Speed Dial FAB =====
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 10,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    zIndex: 12,
  },
  fabText: {
    fontSize: 32,
    lineHeight: 36,
  },
  fabMenuItem: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    elevation: 4,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    zIndex: 11,
  },
  fabMenuIcon: {
    marginRight: 10,
  },
  fabMenuLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
