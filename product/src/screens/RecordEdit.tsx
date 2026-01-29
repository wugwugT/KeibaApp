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
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams } from 'expo-router';

import { saveBetRecord, getBetRecordById, updateBetRecord } from '../services/db/crud';
import { BET_TYPES } from '../constants/betTypes';
import type { BetRecordInput, Place, BetType, BetRecord } from '../types/betRecord';
import type { JRAQRData } from '../services/qr';

type Props = {
  qrData?: JRAQRData | null; // optional にして共存
};

export default function RecordEditScreen({ qrData = null }: Props) {
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id?: string }>();

  // ✅ idはrouter params上はstringなので、DBに渡す前にnumber化
  const idNum = id ? Number(id) : null;
  const isEdit = idNum !== null && !Number.isNaN(idNum);

  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [place, setPlace] = useState<Place | ''>('');
  const [raceNo, setRaceNo] = useState('');
  const [investment, setInvestment] = useState('');
  const [betType, setBetType] = useState<BetType | ''>('');
  const [returnAmount, setReturnAmount] = useState('0');

  // ===== 編集モード：idから既存データ読み込み =====
  useEffect(() => {
    if (!isEdit || idNum === null) return;

    (async () => {
      try {
        const record = await getBetRecordById(idNum);
        if (!record) {
          Alert.alert('エラー', '対象データが見つかりませんでした');
          navigation.goBack();
          return;
        }

        // フォームへ反映
        setDate(record.date);
        setPlace(record.place);
        setRaceNo(String(record.race_no));
        setInvestment(String(record.investment));
        setBetType(record.bet_type);
        setReturnAmount(String(record.return));
      } catch {
        Alert.alert('エラー', 'データの読み込みに失敗しました');
      }
    })();
  }, [isEdit, idNum, navigation]);

  // ===== 新規モード：QRデータ反映（従来通り） =====
  useEffect(() => {
    if (isEdit) return; // 編集中はQR反映しない
    if (!qrData) return;

    setDate(new Date());
    setPlace((qrData.place as Place) ?? '');
    setRaceNo(qrData.race_no ? String(qrData.race_no) : '');
    setInvestment(qrData.total_investment ? String(qrData.total_investment) : '');

    if (qrData.bet_type) {
      setBetType(qrData.bet_type as BetType);
    }
  }, [qrData, isEdit]);

  const handleSave = async () => {
    if (!place || !raceNo || !investment || !betType) {
      Alert.alert('入力不足', '必須項目をすべて入力してください');
      return;
    }

    try {
      if (isEdit && idNum !== null) {
        // ===== 更新 =====
        const updated: BetRecord = {
          id: idNum, // ✅ number
          date,
          place: place as Place,
          race_no: Number(raceNo),
          bet_type: betType as BetType,
          investment: Number(investment),
          return: Number(returnAmount),
        };

        const changes = await updateBetRecord(updated);
        if (changes === 0) {
          Alert.alert('エラー', '更新対象が見つかりませんでした');
          return;
        }

        Alert.alert('更新完了', '収支を更新しました');
        navigation.goBack();
        return;
      }

      // ===== 新規保存 =====
      const input: BetRecordInput = {
        date,
        place: place as Place,
        race_no: Number(raceNo),
        bet_type: betType as BetType,
        investment: Number(investment),
        return: Number(returnAmount),
      };

      await saveBetRecord(input);
      Alert.alert('登録完了', '収支を保存しました');
      navigation.goBack();
    } catch {
      Alert.alert('エラー', isEdit ? '更新に失敗しました' : '保存に失敗しました');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>
            {isEdit ? '馬券内容の編集' : '馬券内容の確認・登録'}
          </Text>

          {/* 日付 */}
          <Text style={styles.label}>日付</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowDatePicker(true)}
          >
            <Text>{date.toLocaleDateString('ja-JP')}</Text>
          </TouchableOpacity>

          <Text style={styles.label}>開催場</Text>
          <TextInput
            style={styles.input}
            value={place}
            onChangeText={(v) => setPlace(v as Place)}
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
            {BET_TYPES.map((type) => (
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
            <Text style={styles.saveButtonText}>
              {isEdit ? '更新する' : '登録する'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal transparent visible={showDatePicker} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <DateTimePicker
              value={date}
              mode="date"
              display="spinner"
              locale="ja-JP"
              themeVariant="light"
              onChange={(_, selectedDate) => {
                if (selectedDate) setDate(selectedDate);
              }}
            />
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.doneText}>決定</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 16, paddingBottom: 140 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  label: { marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 12,
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
  betTypeSelected: { backgroundColor: '#000' },
  betTypeText: { fontSize: 12 },
  betTypeTextSelected: { color: '#fff' },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },
  saveButton: {
    backgroundColor: '#000',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    paddingTop: 16,
  },
  doneButton: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  doneText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
