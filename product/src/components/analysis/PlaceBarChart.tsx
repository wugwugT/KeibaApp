import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export type PlaceStats = {
  place: string;
  investment: number;
  return: number;
  profit: number;
  recoveryRate: number; // %
};

type Props = {
  data: PlaceStats[];
};

export const PlaceBarChart = ({ data }: Props) => {
  const maxRate = useMemo(() => {
    const m = Math.max(...data.map((d) => d.recoveryRate), 100);
    return m;
  }, [data]);

  return (
    <ThemedView style={styles.container}>


      {data.map((item) => {
        const widthPct = Math.max(0, Math.min(100, (item.recoveryRate / maxRate) * 100));
        const barColor = item.profit >= 0 ? '#4CAF50' : '#F44336'; // 勝ち=緑 / 負け=赤

        return (
          <View key={item.place} style={styles.row}>
            <View style={styles.label}>
              <ThemedText type="defaultSemiBold">{item.place}</ThemedText>
            </View>

            <View style={styles.barWrap}>
              <View style={styles.barBg}>
                <View style={[styles.bar, { width: `${widthPct}%`, backgroundColor: barColor }]} />
              </View>
              <ThemedText style={styles.value}>{item.recoveryRate}%</ThemedText>
            </View>
          </View>
        );
      })}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  title: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  label: {
    width: 64,
    paddingRight: 8,
  },
  barWrap: {
    flex: 1,
    gap: 6,
  },
  barBg: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.12)', // ダークでも見える
  },
  bar: {
    height: 10,
    borderRadius: 999,
  },
  value: {
    opacity: 0.9,
  },
});
