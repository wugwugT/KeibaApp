import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { BetRecord } from '@/src/types/betRecord';

export const exportAsCSV = async (records: BetRecord[]): Promise<void> => {
  const header = 'date,place,race_no,bet_type,investment,return\n';
  const rows = records.map(r =>
    `${r.date instanceof Date ? r.date.toISOString() : new Date(r.date).toISOString()},${r.place},${r.race_no},${r.bet_type},${r.investment},${r.return}`
  ).join('\n');
  const file = new File(Paths.cache, 'keiba_records.csv');
  file.write(header + rows);
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: '馬券データをエクスポート' });
};

export const exportAsJSON = async (records: BetRecord[]): Promise<void> => {
  const data = records.map(r => ({
    date: r.date instanceof Date ? r.date.toISOString() : new Date(r.date).toISOString(),
    place: r.place,
    race_no: r.race_no,
    bet_type: r.bet_type,
    investment: r.investment,
    return: r.return,
  }));
  const json = JSON.stringify(data, null, 2);
  const file = new File(Paths.cache, 'keiba_records.json');
  file.write(json);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: '馬券データをエクスポート' });
};
