import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';

import { BetRecord } from '../types/betRecord';
import { getAllBetRecords } from '../services/db/crud';
import { BetRecordCard } from '../components/common/BetRecordCard';

type FilterType = 'all' | 'today' | 'month';

export const Dashboard = () => {
  const [records, setRecords] = useState<BetRecord[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    const data = await getAllBetRecords();
    setRecords(data);
  };

  // ===== フィルタ処理 =====
  const filteredRecords = records.filter((record) => {
    if (filter === 'all') return true;

    const today = new Date();
    const recordDate = new Date(record.date);

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

  // ===== 集計 =====
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

  // ===== UI =====
  return (
    <View style={styles.container}>
      {/* ===== サマリー ===== */}
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
              {key === 'all'
                ? '全期間'
                : key === 'today'
                ? '今日'
                : '今月'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ===== 履歴リスト ===== */}
      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BetRecordCard record={item} />
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
});
