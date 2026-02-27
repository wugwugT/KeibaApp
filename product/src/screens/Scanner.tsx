import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
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

  // カメラ権限確認中
  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* カメラ */}
      {permission.granted && (
        <CameraView
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={getQRBarcodeSettings()}
          onBarcodeScanned={({ data }) => {
            handleQRScanned(data);
          }}
        />
      )}

      {/* ガイド枠オーバーレイ */}
      <View style={styles.guideContainer}>
        <View style={[
          styles.guideFrame,
          state.scanPhase === 'need_second' && styles.guideFrameSecond,
        ]}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>

        {/* スキャン案内テキスト */}
        {state.scanPhase === 'scanning_first' && (
          <View style={styles.guideTextContainer}>
            <Text style={styles.guideTitle} accessibilityRole="header">
              左側のQRコードを読み取ってください
            </Text>
            <Text style={styles.guideSubtitle}>
              馬券の左にあるQRコードにカメラを向けてください
            </Text>
          </View>
        )}
        {state.scanPhase === 'need_second' && (
          <View style={styles.guideTextContainer}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1/2 完了</Text>
            </View>
            <Text style={styles.guideTitleSecond} accessibilityRole="header">
              右側のQRコードを読み取ってください
            </Text>
          </View>
        )}
      </View>

      {/* 2枚目スキャン待ち: やり直すボタン */}
      {state.scanPhase === 'need_second' && (
        <View style={styles.secondQROverlay}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={reset}
            accessibilityLabel="スキャンをやり直す"
            accessibilityRole="button"
          >
            <Text style={styles.resetButtonText}>やり直す</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* エラー表示 */}
      {state.hasError && (
        <View style={styles.errorOverlay} accessibilityRole="alert">
          <View style={styles.overlayCard}>
            <Text style={styles.errorTitle}>読み取りエラー</Text>
            <Text style={styles.errorMessage}>{state.errorMessage}</Text>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={reset}
              accessibilityLabel="スキャンをやり直す"
              accessibilityRole="button"
            >
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

  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ガイド枠
  guideContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },

  guideFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 16,
  },

  guideFrameSecond: {
    borderColor: '#4CAF50',
  },

  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
  },

  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#fff',
    borderTopLeftRadius: 16,
  },

  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#fff',
    borderTopRightRadius: 16,
  },

  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#fff',
    borderBottomLeftRadius: 16,
  },

  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#fff',
    borderBottomRightRadius: 16,
  },

  // スキャン案内テキスト
  guideTextContainer: {
    marginTop: 24,
    alignItems: 'center',
  },

  guideTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  guideSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },

  guideTitleSecond: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },

  stepBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },

  stepBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  // オーバーレイ
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
