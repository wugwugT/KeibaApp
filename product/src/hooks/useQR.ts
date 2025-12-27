/**
 * QR-003: リアルタイムQRコード検出
 * QR-005: 認識通知
 * 
 * QRコード読み取り用のカスタムフック
 */

import {
    extractJRAItemsFromQR,
    extractTicketNoFrom95DigitCode,
    isValidQRData,
    type JRAQRData,
} from '@/src/services/qr';
import * as Haptics from 'expo-haptics';
import { useCallback, useRef, useState } from 'react';

/**
 * QRコード読み取りの状態
 */
export interface QRScanState {
  /** 検出されたQRコードデータ */
  qrData: JRAQRData | null;
  /** 読み取りが完了したか */
  isComplete: boolean;
  /** エラーが発生したか */
  hasError: boolean;
  /** エラーメッセージ */
  errorMessage: string | null;
}

/**
 * QRコード読み取りフック
 * 
 * @returns QRコード読み取りの状態とコールバック関数
 */
export const useQR = () => {
  const [state, setState] = useState<QRScanState>({
    qrData: null,
    isComplete: false,
    hasError: false,
    errorMessage: null,
  });

  // 最後に読み取った時刻を記録（連続読み取り防止用）
  const lastScanTimeRef = useRef<number>(0);
  // 読み取った馬券番号を記録（重複防止用）
  const scannedTicketNosRef = useRef<Set<string>>(new Set());
  // 読み取り間隔（ミリ秒）- 2秒間は同じQRコードを無視
  const SCAN_INTERVAL_MS = 2000;

  /**
   * QRコードが検出されたときのコールバック
   * 
   * @param data - QRコードから読み取った文字列データ
   */
  const handleQRScanned = useCallback((data: string) => {
    try {
      const now = Date.now();
      
      // 問題1: 連続読み取り防止 - 一定時間内の読み取りは無視
      if (now - lastScanTimeRef.current < SCAN_INTERVAL_MS) {
        return; // 無視
      }

      // 問題3: 数字列でない場合は無視（右側のQRコードなど）
      // 最低限の長さチェック（1-41桁の情報を取得するため）
      if (!/^\d+$/.test(data) || data.length < 42) {
        console.log('[QR] 数字列ではない、または短すぎるため無視:', data.length, '桁');
        return; // 無視
      }

      // 問題2: 重複チェック - 馬券番号（17-42桁）を抽出
      const ticketNo = extractTicketNoFrom95DigitCode(data);
      if (ticketNo && scannedTicketNosRef.current.has(ticketNo)) {
        console.log('[QR] 既に読み取った馬券番号のため無視:', ticketNo);
        return; // 無視
      }

      console.log('[QR] QRコード検出:', data.substring(0, 50) + '...');
      
      // JRA項目を抽出
      const extracted = extractJRAItemsFromQR(data);
      console.log('[QR] 抽出結果:', extracted);
      
      // 有効性をチェック
      if (isValidQRData(extracted)) {
        // 馬券番号を記録（重複防止）
        if (ticketNo) {
          scannedTicketNosRef.current.add(ticketNo);
        }
        
        // 最後に読み取った時刻を更新
        lastScanTimeRef.current = now;
        
        // QR-005: 認識通知（振動）
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        setState({
          qrData: extracted,
          isComplete: true,
          hasError: false,
          errorMessage: null,
        });
      } else {
        // 必須項目が揃っていない場合はエラー
        setState({
          qrData: extracted,
          isComplete: false,
          hasError: true,
          errorMessage: 'QRコードから必要な情報を読み取れませんでした',
        });
      }
    } catch (error) {
      console.error('[QR] QRコード処理エラー:', error);
      setState({
        qrData: null,
        isComplete: false,
        hasError: true,
        errorMessage: error instanceof Error ? error.message : 'QRコードの処理に失敗しました',
      });
    }
  }, []);

  /**
   * 状態をリセットする
   */
  const reset = useCallback(() => {
    setState({
      qrData: null,
      isComplete: false,
      hasError: false,
      errorMessage: null,
    });
    // 読み取り間隔のリセット
    lastScanTimeRef.current = 0;
    // 馬券番号の記録は保持（同じセッション内で重複を防ぐため）
  }, []);

  /**
   * エラー状態をクリアする
   */
  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      hasError: false,
      errorMessage: null,
    }));
  }, []);

  return {
    state,
    handleQRScanned,
    reset,
    clearError,
  };
};

