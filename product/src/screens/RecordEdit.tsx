import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TextInput as RNTextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  useColorScheme,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams } from 'expo-router';

import { saveBetRecord, saveBetRecords, getBetRecordById, updateBetRecord, deleteBetRecord } from '../services/db/crud';
import { BET_TYPES } from '../constants/betTypes';
import type { BetRecordInput, Place, BetType, BetRecord } from '../types/betRecord';
import type { JRAQRData } from '../services/qr';
import { Toast } from '../components/common/Toast';

type Props = {
  qrData?: JRAQRData | null; // optional にして共存
};

export default function RecordEditScreen({ qrData = null }: Props) {
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const colors = useMemo(
    () => ({
      bg: isDark ? '#0B0B0B' : '#FFFFFF',
      text: isDark ? '#F2F2F2' : '#111111',
      subText: isDark ? '#BDBDBD' : '#555555',
      border: isDark ? 'rgba(255,255,255,0.18)' : '#CCCCCC',
      inputBg: isDark ? '#141414' : '#FFFFFF',
      cardBg: isDark ? '#141414' : '#F5F5F5',
      innerCardBg: isDark ? '#1A1A1A' : '#FFFFFF',
      footerBg: isDark ? '#0B0B0B' : '#FFFFFF',
      footerBorder: isDark ? 'rgba(255,255,255,0.10)' : '#EEEEEE',

      // ✅ ボタンが背景に沈まないように、ダーク時は少し明るい面にする
      primary: isDark ? '#232323' : '#000000',
      primaryText: '#FFFFFF',
      // ✅ ボタンの境界を出す
      primaryBorder: isDark ? 'rgba(255,255,255,0.22)' : 'transparent',

      chipBorder: isDark ? 'rgba(255,255,255,0.25)' : '#AAAAAA',
      chipBgSelected: isDark ? '#F2F2F2' : '#000000',
      chipTextSelected: isDark ? '#000000' : '#FFFFFF',
      overlay: 'rgba(0,0,0,0.35)',
      modalBg: isDark ? '#141414' : '#FFFFFF',
    }),
    [isDark]
  );

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

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState({ visible: false, message: '' });

  const raceNoRef = useRef<RNTextInput>(null);
  const investmentRef = useRef<RNTextInput>(null);
  const returnRef = useRef<RNTextInput>(null);

  // ===== 編集モード：idから既存データ読み込み =====
  useEffect(() => {
    if (!isEdit || idNum === null) return;

    setIsLoading(true);
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
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isEdit, idNum, navigation]);

  // ===== 新規モード：QRデータ反映（従来通り） =====
  useEffect(() => {
    if (isEdit) return; // 編集中はQR反映しない
    if (!qrData) return;

    if (qrData.estimatedDate) {
      setDate(new Date(qrData.estimatedDate));
    } else {
      setDate(new Date());
    }
    setPlace((qrData.place as Place) ?? '');
    setRaceNo(qrData.race_no ? String(qrData.race_no) : '');
    setInvestment(qrData.total_investment ? String(qrData.total_investment) : '');

    if (qrData.bet_type) {
      setBetType(qrData.bet_type as BetType);
    }
  }, [qrData, isEdit]);

  const handleDelete = () => {
    if (!isEdit || idNum === null) return;

    Alert.alert('削除確認', 'このレコードを削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除する',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBetRecord(idNum);
            setToast({ visible: true, message: 'レコードを削除しました' });
            setTimeout(() => navigation.goBack(), 1500);
          } catch {
            Alert.alert('エラー', '削除に失敗しました');
          }
        },
      },
    ]);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!place) newErrors.place = '競馬場を入力してください';
    if (!raceNo) newErrors.raceNo = 'レース番号を入力してください';
    else if (parseInt(raceNo) < 1 || parseInt(raceNo) > 16)
      newErrors.raceNo = '1〜16の範囲で入力してください';
    if (!investment) newErrors.investment = '投資額を入力してください';
    else if (parseInt(investment) < 0)
      newErrors.investment = '0以上の値を入力してください';
    if (!betType) newErrors.betType = '式別を選択してください';
    if (returnAmount && parseInt(returnAmount) < 0)
      newErrors.returnAmount = '0以上の値を入力してください';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

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

        setToast({ visible: true, message: '収支を更新しました' });
        setTimeout(() => navigation.goBack(), 1500);
        return;
      }

      // ===== 新規保存 =====
      // 複数口(normal_entries > 1)の場合、1口=1レコードとして分割保存
      const entries = qrData?.normal_entries;
      if (entries && entries.length > 1) {
        const inputs: BetRecordInput[] = entries.map((entry) => ({
          date,
          place: place as Place,
          race_no: Number(raceNo),
          bet_type: entry.bet_type,
          investment: entry.investment,
          return: 0,
        }));

        await saveBetRecords(inputs);
        setToast({ visible: true, message: `${entries.length}口の馬券を保存しました` });
        setTimeout(() => navigation.goBack(), 1500);
        return;
      }

      // 単口の場合（従来通り）
      const input: BetRecordInput = {
        date,
        place: place as Place,
        race_no: Number(raceNo),
        bet_type: betType as BetType,
        investment: Number(investment),
        return: Number(returnAmount),
      };

      await saveBetRecord(input);
      setToast({ visible: true, message: '収支を保存しました' });
      setTimeout(() => navigation.goBack(), 1500);
    } catch {
      Alert.alert('エラー', isEdit ? '更新に失敗しました' : '保存に失敗しました');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
            <ActivityIndicator />
          </View>
        ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.bg }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.title, { color: colors.text }]}>
            {isEdit ? '馬券内容の編集' : '馬券内容の確認・登録'}
          </Text>

          {/* 日付 */}
          <Text style={[styles.label, { color: colors.subText }]}>日付</Text>
          <TouchableOpacity
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBg,
                borderColor: colors.border,
              },
            ]}
            onPress={() => setShowDatePicker(true)}
            accessibilityLabel="日付"
            accessibilityHint="タップして日付を選択します"
          >
            <Text style={{ color: colors.text }}>{date.toLocaleDateString('ja-JP')}</Text>
          </TouchableOpacity>

          <Text style={[styles.label, { color: colors.subText }]}>開催場</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text },
            ]}
            value={place}
            onChangeText={(v) => setPlace(v as Place)}
            placeholder="例：東京"
            placeholderTextColor={colors.subText}
            returnKeyType="next"
            onSubmitEditing={() => raceNoRef.current?.focus()}
            accessibilityLabel="開催場"
            accessibilityHint="競馬場名を入力してください"
          />
          {errors.place && <Text style={styles.errorText}>{errors.place}</Text>}

          <Text style={[styles.label, { color: colors.subText }]}>レース番号</Text>
          <TextInput
            ref={raceNoRef}
            style={[
              styles.input,
              { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text },
            ]}
            value={raceNo}
            onChangeText={setRaceNo}
            keyboardType="number-pad"
            placeholder="例：11"
            placeholderTextColor={colors.subText}
            returnKeyType="next"
            onSubmitEditing={() => investmentRef.current?.focus()}
            accessibilityLabel="レース番号"
            accessibilityHint="1から16の数字を入力してください"
          />
          {errors.raceNo && <Text style={styles.errorText}>{errors.raceNo}</Text>}

          <Text style={[styles.label, { color: colors.subText }]}>投資額（円）</Text>
          <TextInput
            ref={investmentRef}
            style={[
              styles.input,
              { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text },
            ]}
            value={investment}
            onChangeText={setInvestment}
            keyboardType="number-pad"
            placeholder="例：1000"
            placeholderTextColor={colors.subText}
            returnKeyType="next"
            onSubmitEditing={() => returnRef.current?.focus()}
            accessibilityLabel="投資額"
            accessibilityHint="円単位で投資額を入力してください"
          />
          {errors.investment && <Text style={styles.errorText}>{errors.investment}</Text>}

          {/* 複合馬券の各口を表示 */}
          {qrData?.normal_entries && qrData.normal_entries.length > 1 && (
            <View style={[styles.entriesContainer, { backgroundColor: colors.cardBg }]}>
              <Text style={[styles.label, { color: colors.subText, marginTop: 0 }]}>
                各口の情報（{qrData.normal_entries.length}口）
              </Text>

              {qrData.normal_entries.map((entry, index) => (
                <View
                  key={index}
                  style={[styles.entryContainer, { backgroundColor: colors.innerCardBg }]}
                >
                  <Text style={[styles.entryTitle, { color: colors.text }]}>口{index + 1}</Text>
                  <Text style={[styles.entryText, { color: colors.subText }]}>
                    式別: {entry.bet_type}
                  </Text>
                  {entry.first_place && (
                    <Text style={[styles.entryText, { color: colors.subText }]}>
                      1着: {entry.first_place}番
                    </Text>
                  )}
                  {entry.second_place && (
                    <Text style={[styles.entryText, { color: colors.subText }]}>
                      2着: {entry.second_place}番
                    </Text>
                  )}
                  {entry.third_place && (
                    <Text style={[styles.entryText, { color: colors.subText }]}>
                      3着: {entry.third_place}番
                    </Text>
                  )}
                  {entry.bet_type === '馬単' && entry.ura && (
                    <Text style={[styles.entryText, { color: colors.subText }]}>裏あり</Text>
                  )}
                  <Text style={[styles.entryText, { color: colors.subText }]}>
                    投資額: {entry.investment.toLocaleString()}円
                  </Text>
                </View>
              ))}

              <Text style={[styles.bulkSaveNotice, { color: colors.subText }]}>
                {qrData.normal_entries.length}口の馬券として保存します（回収額は後から個別に編集できます）
              </Text>
            </View>
          )}

          {/* ボックスの場合 */}
          {qrData?.box_selection && (
            <View style={[styles.entriesContainer, { backgroundColor: colors.cardBg }]}>
              <Text style={[styles.label, { color: colors.subText, marginTop: 0 }]}>
                ボックス選択
              </Text>
              <Text style={[styles.entryText, { color: colors.subText }]}>
                式別: {qrData.box_selection.bet_type}
              </Text>
              <Text style={[styles.entryText, { color: colors.subText }]}>
                選択馬番: {qrData.box_selection.selections.join(', ')}
              </Text>
              <Text style={[styles.entryText, { color: colors.subText }]}>
                投資額: {qrData.box_selection.investment.toLocaleString()}円
              </Text>
            </View>
          )}

          {/* ながしの場合 */}
          {qrData?.nagashi_selection && (
            <View style={[styles.entriesContainer, { backgroundColor: colors.cardBg }]}>
              <Text style={[styles.label, { color: colors.subText, marginTop: 0 }]}>
                ながし選択
              </Text>
              <Text style={[styles.entryText, { color: colors.subText }]}>
                式別: {qrData.nagashi_selection.bet_type}
              </Text>
              {qrData.nagashi_selection.axis1_selections.length > 0 && (
                <Text style={[styles.entryText, { color: colors.subText }]}>
                  軸1: {qrData.nagashi_selection.axis1_selections.join(', ')}
                </Text>
              )}
              {qrData.nagashi_selection.axis2_selections.length > 0 && (
                <Text style={[styles.entryText, { color: colors.subText }]}>
                  軸2: {qrData.nagashi_selection.axis2_selections.join(', ')}
                </Text>
              )}
              <Text style={[styles.entryText, { color: colors.subText }]}>
                相手: {qrData.nagashi_selection.opponent_selections.join(', ')}
              </Text>
              {qrData.nagashi_selection.is_multi && (
                <Text style={[styles.entryText, { color: colors.subText }]}>マルチあり</Text>
              )}
              <Text style={[styles.entryText, { color: colors.subText }]}>
                投資額: {qrData.nagashi_selection.investment.toLocaleString()}円
              </Text>
            </View>
          )}

          {/* フォーメーションの場合 */}
          {qrData?.formation_selection && (
            <View style={[styles.entriesContainer, { backgroundColor: colors.cardBg }]}>
              <Text style={[styles.label, { color: colors.subText, marginTop: 0 }]}>
                フォーメーション選択
              </Text>
              <Text style={[styles.entryText, { color: colors.subText }]}>
                1着: {qrData.formation_selection.first_place_selections.join(', ')}
              </Text>
              <Text style={[styles.entryText, { color: colors.subText }]}>
                2着: {qrData.formation_selection.second_place_selections.join(', ')}
              </Text>
              <Text style={[styles.entryText, { color: colors.subText }]}>
                3着: {qrData.formation_selection.third_place_selections.join(', ')}
              </Text>
              <Text style={[styles.entryText, { color: colors.subText }]}>
                投資額: {qrData.formation_selection.investment.toLocaleString()}円
              </Text>
            </View>
          )}

          <Text style={[styles.label, { color: colors.subText }]}>式別</Text>
          <View style={styles.betTypeContainer}>
            {BET_TYPES.map((type) => {
              const selected = betType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.betTypeButton,
                    {
                      borderColor: colors.chipBorder,
                      backgroundColor: selected ? colors.chipBgSelected : 'transparent',
                    },
                  ]}
                  onPress={() => setBetType(type)}
                  accessibilityLabel={`${type}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[
                      styles.betTypeText,
                      { color: selected ? colors.chipTextSelected : colors.text },
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {errors.betType && <Text style={styles.errorText}>{errors.betType}</Text>}

          <Text style={[styles.label, { color: colors.subText }]}>回収額（円）</Text>
          <TextInput
            ref={returnRef}
            style={[
              styles.input,
              { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text },
            ]}
            value={returnAmount}
            onChangeText={setReturnAmount}
            keyboardType="number-pad"
            placeholder="例：0"
            placeholderTextColor={colors.subText}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
            accessibilityLabel="回収額"
            accessibilityHint="円単位で回収額を入力してください"
          />
          {errors.returnAmount && <Text style={styles.errorText}>{errors.returnAmount}</Text>}
        </ScrollView>
        )}

        <Toast
          message={toast.message}
          visible={toast.visible}
          onHide={() => setToast({ visible: false, message: '' })}
        />

        <View
          style={[
            styles.footer,
            { backgroundColor: colors.footerBg, borderColor: colors.footerBorder },
          ]}
        >
          {isEdit && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              accessibilityLabel="削除"
              accessibilityRole="button"
            >
              <Text style={styles.saveButtonText}>削除する</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.saveButton,
              {
                backgroundColor: colors.primary,
                borderWidth: 1,
                borderColor: colors.primaryBorder,

                // iOS: ふわっと浮かせる
                shadowColor: '#000',
                shadowOpacity: isDark ? 0.35 : 0.2,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 6 },

                // Android
                elevation: isDark ? 6 : 2,
              },
            ]}
            onPress={handleSave}
            accessibilityLabel="保存"
            accessibilityRole="button"
          >
            <Text style={[styles.saveButtonText, { color: colors.primaryText }]}>
              {isEdit
                ? '更新する'
                : qrData?.normal_entries && qrData.normal_entries.length > 1
                  ? `${qrData.normal_entries.length}口を一括登録する`
                  : '登録する'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal transparent visible={showDatePicker} animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.modalBg }]}>
            <DateTimePicker
              value={date}
              mode="date"
              display="spinner"
              locale="ja-JP"
              themeVariant={isDark ? 'dark' : 'light'}
              onChange={(_, selectedDate) => {
                if (selectedDate) setDate(selectedDate);
              }}
            />
            <TouchableOpacity
              style={[styles.doneButton, { borderColor: colors.footerBorder }]}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={[styles.doneText, { color: colors.text }]}>決定</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  scrollContent: { padding: 16, paddingBottom: 140 },

  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },

  label: { marginTop: 12, marginBottom: 4 },

  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },

  betTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  betTypeButton: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  betTypeText: { fontSize: 12 },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    overflow: 'hidden',
  },
  saveButtonText: { fontSize: 16, fontWeight: 'bold' },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    paddingTop: 16,
  },
  doneButton: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  doneText: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  entriesContainer: {
    marginTop: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 10,
  },
  entryContainer: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
  },
  entryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  entryText: {
    fontSize: 12,
    marginTop: 2,
  },
  bulkSaveNotice: {
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 2,
  },
});
