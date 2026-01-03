import { View, Text, StyleSheet } from 'react-native';
import { BetRecord } from '../../types/betRecord';

type Props = {
  record: BetRecord;
};

export const BetRecordCard = ({ record }: Props) => {
  const profit = record.return - record.investment;

  const profitColor =
    profit > 0 ? '#2ecc71' :
    profit < 0 ? '#e74c3c' :
    '#7f8c8d';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.date}>
          {record.date.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })}　{record.place} {record.race_no}R
        </Text>
      </View>

      <Text style={[styles.profit, { color: profitColor }]}>
        {profit >= 0 ? '+' : ''}
        {profit.toLocaleString()}円
      </Text>

      <Text style={styles.investment}>
        投資: {record.investment.toLocaleString()}円
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  header: {
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
    color: '#555',
  },
  profit: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  investment: {
    fontSize: 14,
    color: '#777',
  },
});
