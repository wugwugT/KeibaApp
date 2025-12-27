import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * フィルタ種別
 * - all   : 全期間
 * - today : 今日
 * - month : 今月
 */
type FilterType = "all" | "today" | "month";

export default function Dashboard() {
  // ===== フィルタ状態 =====
  const [filter, setFilter] = useState<FilterType>("all");

  // ===== 仮データ（後で useStats に置き換える）=====
  const totalInvestment: number = 10000;
  const totalReturn: number = 12000;

  const profit = totalReturn - totalInvestment;
  const recoveryRate =
    totalInvestment === 0
      ? 0
      : Math.round((totalReturn / totalInvestment) * 100);

  return (
    <SafeAreaView style={styles.container}>
      {/* タイトル */}
      <Text style={styles.title}>収支サマリー</Text>

      {/* ===== フィルタ切り替え（4.1.2）===== */}
      <View style={styles.filterRow}>
        <Text
          style={[styles.filterButton, filter === "all" && styles.active]}
          onPress={() => setFilter("all")}
        >
          全期間
        </Text>

        <Text
          style={[styles.filterButton, filter === "today" && styles.active]}
          onPress={() => setFilter("today")}
        >
          今日
        </Text>

        <Text
          style={[styles.filterButton, filter === "month" && styles.active]}
          onPress={() => setFilter("month")}
        >
          今月
        </Text>
      </View>

      {/* ===== サマリー表示（4.1.1）===== */}
      <View style={styles.summaryCard}>
        <View style={styles.row}>
          <Text style={styles.label}>総投資</Text>
          <Text style={styles.value}>
            {totalInvestment.toLocaleString()} 円
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>総回収</Text>
          <Text style={styles.value}>
            {totalReturn.toLocaleString()} 円
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>収支</Text>
          <Text
            style={[
              styles.value,
              profit >= 0 ? styles.plus : styles.minus,
            ]}
          >
            {profit >= 0 ? "+" : ""}
            {profit.toLocaleString()} 円
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>回収率</Text>
          <Text style={styles.value}>{recoveryRate}%</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
  },

  /* フィルタ */
  filterRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  filterButton: {
    marginRight: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#eee",
    color: "#333",
    overflow: "hidden",
  },
  active: {
    backgroundColor: "#4CAF50",
    color: "#fff",
  },

  /* サマリーカード */
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    color: "#555",
  },
  value: {
    fontSize: 16,
    fontWeight: "bold",
  },
  plus: {
    color: "#2e7d32",
  },
  minus: {
    color: "#c62828",
  },
});
