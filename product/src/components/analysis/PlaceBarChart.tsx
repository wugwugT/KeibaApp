import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

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
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  const maxRate = useMemo(() => {
    const m = Math.max(...data.map((d) => d.recoveryRate), 100);
    return m;
  }, [data]);

  return (
    <ThemedView style={styles.container}>


      {data.map((item) => {
        const widthPct = Math.max(0, Math.min(100, (item.recoveryRate / maxRate) * 100));
        const barColor = item.profit >= 0 ? c.profit : c.loss;

        return (
          <View key={item.place} style={styles.row}>
            <View style={styles.label}>
              <ThemedText type="defaultSemiBold">{item.place}</ThemedText>
            </View>

            <View style={styles.barWrap}>
              <View style={[styles.barBg, { backgroundColor: c.subtle }]}>
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
  },
  bar: {
    height: 10,
    borderRadius: 999,
  },
  value: {
    opacity: 0.9,
  },
});
