import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { BetRecord } from '../../types/betRecord';

type Props = {
  record: BetRecord;
  onPress?: () => void;
};

export const BetRecordCard = ({ record, onPress }: Props) => {
  const { colors, dark } = useTheme();

  const profit = record.return - record.investment;

  const profitColor =
    profit > 0 ? '#2ecc71' :
    profit < 0 ? '#e74c3c' :
    '#7f8c8d';

  // ダーク/ライトで薄い文字の見え方を調整（themeに無いので自前で）
  const subTextColor = dark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.6)';

  const content = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          // darkでは影が汚くなりがちなので抑える
          shadowColor: dark ? 'transparent' : '#000',
          borderColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.date, { color: subTextColor }]}>
          {record.date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })}{' '}
          　{record.place} {record.race_no}R
        </Text>
      </View>

      <Text style={[styles.profit, { color: profitColor }]}>
        {profit >= 0 ? '+' : ''}
        {profit.toLocaleString()}円
      </Text>

      <Text style={[styles.investment, { color: subTextColor }]}>
        投資: {record.investment.toLocaleString()}円
      </Text>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
    >
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,

    // 影（iOS）
    shadowOpacity: 0.1,
    shadowRadius: 6,

    // 影（Android）
    elevation: 3,

    // darkでの見やすさ用（薄い枠）
    borderWidth: 1,
  },
  header: {
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
  },
  profit: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  investment: {
    fontSize: 14,
  },
});
