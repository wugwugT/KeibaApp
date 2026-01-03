import { useLocalSearchParams } from 'expo-router';
import RecordEditScreen from '../src/screens/RecordEdit';
import type { JRAQRData } from '../src/services/qr';

export default function RecordEdit() {
  // Scanner から渡された params を受け取る
  const params = useLocalSearchParams<{ qr?: string }>();

  let qrData: JRAQRData | null = null;

  if (params.qr) {
    try {
      qrData = JSON.parse(params.qr);
    } catch (e) {
      console.error('QR parse error:', e);
    }
  }

  // デバッグ用（一度確認したら消してOK）
  console.log('RecordEdit received qrData:', qrData);

  // screens/RecordEdit.tsx に渡す
  return <RecordEditScreen qrData={qrData} />;
}
