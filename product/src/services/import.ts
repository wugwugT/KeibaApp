import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import type { BetRecordInput, Place, BetType } from '@/src/types/betRecord';

export const importFromCSV = async (): Promise<BetRecordInput[]> => {
  const result = await DocumentPicker.getDocumentAsync({ type: 'text/csv' });
  if (result.canceled || !result.assets?.length) return [];
  const file = new File(result.assets[0].uri);
  const content = await file.text();
  const lines = content.split('\n').slice(1); // ヘッダー除去
  return lines.filter(l => l.trim()).map(line => {
    const [dateStr, place, raceNo, betType, investment, ret] = line.split(',');
    return {
      date: new Date(dateStr),
      place: place as Place,
      race_no: parseInt(raceNo, 10),
      bet_type: betType as BetType,
      investment: parseInt(investment, 10),
      return: parseInt(ret, 10),
    };
  });
};
