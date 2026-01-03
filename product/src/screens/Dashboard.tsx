import { useState, useCallback } from 'react';
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

  const filteredRecords = records.filter((record) => {
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

  const totalInvestment = filteredRecords.reduce(
    (sum, r) => sum + r.investment,
    0
  );

  const totalReturn = filteredRecords.reduce(
    (sum, r) => sum + r.return,
    0
  );

  const profit = totalReturn - totalInvestment;

  const recoveryRate =
    totalInvestment === 0
      ? 0
      : Math.round((totalReturn / totalInvestment) * 100);

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <BetRecordCard record={item} />
        )}
        ListHeaderComponent={
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>収支サマリー</Text>

              <Text
                style={[
                  styles.summaryProfit,
                  { color: profit >= 0 ? '#2ecc71' : '#e74c3c' },
                ]}
              >
                {profit >= 0 ? '+' : ''}
                {profit.toLocaleString()}円
              </Text>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>
                  投資: {totalInvestment.toLocaleString()}円
                </Text>
                <Text style={styles.summaryText}>
                  回収率: {recoveryRate}%
                </Text>
              </View>
            </View>

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
                    {key === 'all'
                      ? '全期間'
                      : key === 'today'
                      ? '今日'
                      : '今月'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {/* ===== ＋ボタン（Scanner起動） ===== */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/scanner')}
      >
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
    fontSize: 28,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#555',
  },
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
