import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useEffect, useState, useRef, useCallback } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';

import {
  extractJRAItemsFromQR,
  isValidQRData,
  getQRBarcodeSettings,
} from '@/src/services/qr';
import {
  extractJRAItemsFromOCR,
  isValidOCRData as isValidOCRDataCheck,
} from '@/src/services/ocr';

type ScanMode = 'OCR' | 'QR';

export default function ScannerScreen() {
  const [scanMode, setScanMode] = useState<ScanMode>('QR');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  // 多重遷移防止
  const hasNavigatedRef = useRef(false);
  // OCR撮影中フラグ
  const isCapturingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      hasNavigatedRef.current = false;
      isCapturingRef.current = false;
    }, [])
  );

  // カメラ権限
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  // ★ ボタンから呼ぶOCR撮影関数
  const handleOcrCapture = async () => {
    if (!permission?.granted) return;
    if (!cameraRef.current) return;
    if (hasNavigatedRef.current) return;
    if (isCapturingRef.current) return;

    try {
      isCapturingRef.current = true;

      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        skipProcessing: true,
        quality: 0.5,
      });

      if (!photo?.base64) {
        return;
      }

      const parsed = await extractJRAItemsFromOCR(photo.base64);
      console.log('OCR parsed:', parsed);

      if (isValidOCRDataCheck(parsed)) {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
        hasNavigatedRef.current = true;
        router.push({
          pathname: '/recordEdit',
          params: {
            ocr: JSON.stringify(parsed),
          },
        });
      } else {
        // 失敗時は軽くバイブだけ
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning
        );
      }
    } catch (error) {
      console.log('OCR capture error:', error);
    } finally {
      isCapturingRef.current = false;
    }
  };

  return (
    <View style={styles.root}>
      {/* カメラ (QR) */}
      {scanMode === 'QR' && permission?.granted && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
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

      {/* カメラ (OCR) */}
      {scanMode === 'OCR' && permission?.granted && (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          mode="picture"
        />
      )}

      {/* OCR未実装時の背景 (権限なし用) */}
      {scanMode === 'OCR' && !permission?.granted && (
        <View style={styles.ocrPlaceholder}>
          <Text style={{ color: '#fff' }}>カメラ権限を許可してね</Text>
        </View>
      )}

      {/* レティクル＆ガイド (OCR時のみ表示) */}
      {scanMode === 'OCR' && permission?.granted && (
        <View style={styles.overlay}>
          <View style={styles.reticle} />
          <Text style={styles.guideText}>馬券を枠内に合わせて</Text>
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
              isCapturingRef.current = false;
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

      {/* ★ OCR専用キャプチャボタン（画面下部） */}
      {scanMode === 'OCR' && permission?.granted && (
        <View style={styles.captureBar}>
          <TouchableOpacity
            style={[
              styles.captureButton,
              isCapturingRef.current && styles.captureButtonDisabled,
            ]}
            onPress={handleOcrCapture}
            disabled={isCapturingRef.current}
          >
            <Text style={styles.captureText}>
              {isCapturingRef.current ? '読み取り中...' : 'OCRスキャン'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
    top: 56,
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

  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },

  reticle: {
    width: 260,
    height: 160,
    borderWidth: 3,
    borderColor: '#00FF00',
    backgroundColor: 'transparent',
    borderRadius: 8,
  },

  guideText: {
    color: '#00FF00',
    marginTop: 20,
    fontSize: 16,
    fontWeight: '600',
  },

  // ★ 追加: 下部のOCRボタンバー
  captureBar: {
  position: 'absolute',
  bottom: 32,
  left: 0,
  right: 0,
  alignItems: 'center',
  zIndex: 10,
},
captureButton: {
  backgroundColor: '#ffffffdd',
  paddingVertical: 14,      // ← 縦を大きく
  paddingHorizontal: 40,    // ← 横も少し広く
  borderRadius: 999,        // ← 丸ボタン風に
  borderWidth: 1,
  borderColor: '#000',
},
captureButtonDisabled: {
  opacity: 0.6,
},
captureText: {
  fontSize: 16,             // ← 文字もちょい大きく
  fontWeight: '700',
  color: '#000',
},

});
