import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { saveBetRecord } from '../services/db/crud';
import { BET_TYPES } from '../constants/betTypes';
import type { BetRecordInput, Place, BetType } from '../types/betRecord';
import type { JRAQRData } from '../services/qr';

/**
 * UI-003: 入力・修正画面
 */

type Props = {
  qrData: JRAQRData | null;
};

export default function RecordEditScreen({ qrData }: Props) {
  const navigation = useNavigation();

  // フォーム状態（最初は空）
  const [place, setPlace] = useState<Place | ''>('');
  const [raceNo, setRaceNo] = useState('');
  const [investment, setInvestment] = useState('');
  const [betType, setBetType] = useState<BetType | ''>('');
  const [returnAmount, setReturnAmount] = useState('0');

  /**
   * ✅ QRデータが届いたらフォームに反映
   * （ここが今回の本質的な修正）
   */
  useEffect(() => {
    if (!qrData) return;

    setPlace((qrData.place as Place) ?? '');
    setRaceNo(qrData.race_no ? String(qrData.race_no) : '');
    setInvestment(
      qrData.total_investment
        ? String(qrData.total_investment)
        : ''
    );

    // QRに式別があれば反映
    if (qrData.bet_type) {
      setBetType(qrData.bet_type as BetType);
    }
  }, [qrData]);

  const handleSave = async () => {
    if (!place || !raceNo || !investment || !betType) {
      Alert.alert('入力不足', '必須項目をすべて入力してください');
      return;
    }

    const input: BetRecordInput = {
      date: new Date().toISOString().slice(0, 10),
      place,
      race_no: Number(raceNo),
      bet_type: betType,
      investment: Number(investment),
      return: Number(returnAmount),
    };

    try {
      await saveBetRecord(input);
      Alert.alert('登録完了', '収支を保存しました');
      navigation.goBack();
    } catch (e) {
      Alert.alert('エラー', '保存に失敗しました');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>馬券内容の確認・登録</Text>

          <Text style={styles.label}>開催場</Text>
          <TextInput
            style={styles.input}
            value={place}
            onChangeText={(v) => setPlace(v as Place)}
            placeholder="東京"
          />

          <Text style={styles.label}>レース番号</Text>
          <TextInput
            style={styles.input}
            value={raceNo}
            onChangeText={setRaceNo}
            keyboardType="number-pad"
          />

          <Text style={styles.label}>投資額（円）</Text>
          <TextInput
            style={styles.input}
            value={investment}
            onChangeText={setInvestment}
            keyboardType="number-pad"
          />

          <Text style={styles.label}>式別</Text>
          <View style={styles.betTypeContainer}>
            {BET_TYPES.map((type: BetType) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.betTypeButton,
                  betType === type && styles.betTypeSelected,
                ]}
                onPress={() => setBetType(type)}
              >
                <Text
                  style={[
                    styles.betTypeText,
                    betType === type && styles.betTypeTextSelected,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>回収額（円）</Text>
          <TextInput
            style={styles.input}
            value={returnAmount}
            onChangeText={setReturnAmount}
            keyboardType="number-pad"
          />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>登録する</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 140,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  label: {
    marginTop: 12,
    marginBottom: 4,
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
  },
  betTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  betTypeButton: {
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  betTypeSelected: {
    backgroundColor: '#000',
  },
  betTypeText: {
    fontSize: 12,
  },
  betTypeTextSelected: {
    color: '#fff',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  saveButton: {
    backgroundColor: '#000',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
