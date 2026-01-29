import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';

import { BetRecord } from '../types/betRecord';
import { getAllBetRecords } from '../services/db/crud';
import { BetRecordCard } from '../components/common/BetRecordCard';

type FilterType = 'all' | 'today' | 'month';

const toYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const Dashboard = () => {
  const [records, setRecords] = useState<BetRecord[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');

  useFocusEffect(
    useCallback(() => {
      loadRecords();
    }, [])
  );

  const loadRecords = async () => {
    const data = await getAllBetRecords();
    setRecords(data);
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

      return true;
    });
  }, [records, filter]);

  // ===== ANA-007: 統計サマリー =====
  const summary = useMemo(() => {
    const totalInvestment = filteredRecords.reduce((sum, r) => sum + r.investment, 0);
    const totalReturn = filteredRecords.reduce((sum, r) => sum + r.return, 0);
    const totalProfit = totalReturn - totalInvestment;

    const recoveryRate =
      totalInvestment === 0 ? 0 : Math.round((totalReturn / totalInvestment) * 100);

    // 日別集計（勝率と平均日次収支用）
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

  const profitColor = summary.totalProfit >= 0 ? '#2ecc71' : '#e74c3c';
  const avgColor = summary.avgDailyProfit >= 0 ? '#2ecc71' : '#e74c3c';

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
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
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>収支サマリー</Text>

              <Text style={[styles.summaryProfit, { color: profitColor }]}>
                {summary.totalProfit >= 0 ? '+' : ''}
                {summary.totalProfit.toLocaleString()}円
              </Text>

              <View style={styles.summarySubRow}>
                <Text style={styles.summarySubText}>
                  投資: {summary.totalInvestment.toLocaleString()}円
                </Text>
                <Text style={styles.summarySubText}>
                  回収: {summary.totalReturn.toLocaleString()}円
                </Text>
              </View>

              <View style={styles.summaryGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>回収率</Text>
                  <Text style={styles.statValue}>{summary.recoveryRate}%</Text>
                </View>

                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>勝率（日別）</Text>
                  <Text style={styles.statValue}>{summary.winRate}%</Text>
                </View>

                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>平均日次収支</Text>
                  <Text style={[styles.statValue, { color: avgColor }]}>
                    {summary.avgDailyProfit >= 0 ? '+' : ''}
                    {summary.avgDailyProfit.toLocaleString()}円
                  </Text>
                </View>

                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>対象日数</Text>
                  <Text style={styles.statValue}>{summary.days}日</Text>
                </View>
              </View>
            </View>

            {/* ===== フィルタ ===== */}
            <View style={styles.filterRow}>
              {(['all', 'today', 'month'] as FilterType[]).map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.filterButton,
                    filter === key && styles.filterButtonActive,
                  ]}
                  onPress={() => setFilter(key)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      filter === key && styles.filterTextActive,
                    ]}
                  >
                    {key === 'all' ? '全期間' : key === 'today' ? '今日' : '今月'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {/* ===== ＋ボタン（Scanner起動） ===== */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/scanner')}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f2f2f2',
  },

  // ===== サマリー =====
  summaryCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
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
    color: '#555',
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
    backgroundColor: '#f7f7f7',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
  },

  // ===== フィルタ =====
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#ddd',
  },
  filterButtonActive: {
    backgroundColor: '#2c3e50',
  },
  filterText: {
    fontSize: 14,
    color: '#333',
  },
  filterTextActive: {
    color: '#fff',
  },

  /** ＋ボタン */
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  fabText: {
    color: '#fff',
    fontSize: 32,
    lineHeight: 36,
  },
});
