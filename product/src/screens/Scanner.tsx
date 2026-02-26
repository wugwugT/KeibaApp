import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useEffect, useCallback } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect } from 'expo-router';

import { getQRBarcodeSettings } from '@/src/services/qr';
import { useQR } from '@/src/hooks/useQR';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const { state, handleQRScanned, reset } = useQR();

  /**
   * recordEdit → 戻ってきた時に
   * 再スキャンできるようにする
   */
  useFocusEffect(
    useCallback(() => {
      reset();
    }, [reset])
  );

  // カメラ権限
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  // スキャン完了 → recordEditに遷移
  useEffect(() => {
    if (state.isComplete && state.qrData) {
      router.push({
        pathname: '/recordEdit',
        params: {
          qr: JSON.stringify(state.qrData),
        },
      });
    }
  }, [state.isComplete, state.qrData]);

  return (
    <View style={styles.root}>
      {/* カメラ */}
      {permission?.granted && (
        <CameraView
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={getQRBarcodeSettings()}
          onBarcodeScanned={({ data }) => {
            handleQRScanned(data);
          }}
        />
      )}

      {/* 2枚目スキャン待ちオーバーレイ */}
      {state.scanPhase === 'need_second' && (
        <View style={styles.secondQROverlay}>
          <View style={styles.overlayCard}>
            <Text style={styles.overlayTitle}>2枚目のQRコード</Text>
            <Text style={styles.overlayMessage}>
              右側のQRコードをスキャンしてください
            </Text>
            <TouchableOpacity style={styles.resetButton} onPress={reset}>
              <Text style={styles.resetButtonText}>やり直す</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* エラー表示 */}
      {state.hasError && (
        <View style={styles.errorOverlay}>
          <View style={styles.overlayCard}>
            <Text style={styles.errorTitle}>読み取りエラー</Text>
            <Text style={styles.errorMessage}>{state.errorMessage}</Text>
            <TouchableOpacity style={styles.resetButton} onPress={reset}>
              <Text style={styles.resetButtonText}>やり直す</Text>
            </TouchableOpacity>
          </View>
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

  secondQROverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 80,
    alignItems: 'center',
  },

  errorOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 80,
    alignItems: 'center',
  },

  overlayCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 28,
    alignItems: 'center',
    width: '100%',
  },

  overlayTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  overlayMessage: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },

  errorTitle: {
    color: '#ff6b6b',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  errorMessage: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },

  resetButton: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 32,
  },

  resetButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
