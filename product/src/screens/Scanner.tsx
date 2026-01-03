import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useEffect, useState, useRef, useCallback } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect } from 'expo-router';

import {
  extractJRAItemsFromQR,
  isValidQRData,
  getQRBarcodeSettings,
} from '@/src/services/qr';

type ScanMode = 'OCR' | 'QR';

export default function ScannerScreen() {
  const [scanMode, setScanMode] = useState<ScanMode>('QR');
  const [permission, requestPermission] = useCameraPermissions();

  // 多重遷移防止
  const hasNavigatedRef = useRef(false);

  /**
   * recordEdit → 戻ってきた時に
   * 再スキャンできるようにする
   */
  useFocusEffect(
    useCallback(() => {
      hasNavigatedRef.current = false;
    }, [])
  );

  // カメラ権限
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  return (
    <View style={styles.root}>
      {/* カメラ */}
      {scanMode === 'QR' && permission?.granted && (
        <CameraView
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={getQRBarcodeSettings()}
          onBarcodeScanned={({ data }) => {
            if (hasNavigatedRef.current) return;

            const parsed = extractJRAItemsFromQR(data);

            if (isValidQRData(parsed)) {
              hasNavigatedRef.current = true;

              router.push({
                pathname: '/recordEdit',
                params: {
                  qr: JSON.stringify(parsed),
                },
              });
            }
          }}
        />
      )}

      {/* OCR未実装時の背景 */}
      {scanMode === 'OCR' && (
        <View style={styles.ocrPlaceholder}>
          <Text style={{ color: '#fff' }}>OCRは未実装</Text>
        </View>
      )}

      {/* モード切替（カメラの上に重ねる） */}
      <View style={styles.segment}>
        {(['OCR', 'QR'] as ScanMode[]).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.button,
              scanMode === mode && styles.active,
            ]}
            onPress={() => {
              setScanMode(mode);
              hasNavigatedRef.current = false;
            }}
          >
            <Text
              style={[
                styles.text,
                scanMode === mode && styles.activeText,
              ]}
            >
              {mode}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },

  segment: {
    position: 'absolute',
    top: 56, // ← ステータスバー下に自然に配置
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: '#eee',
    borderRadius: 8,
    zIndex: 10,
  },

  button: {
    paddingVertical: 8,
    paddingHorizontal: 24,
  },

  text: {
    color: '#666',
    fontSize: 14,
  },

  active: {
    backgroundColor: '#000',
    borderRadius: 8,
  },

  activeText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  ocrPlaceholder: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
