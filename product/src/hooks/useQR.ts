/**
 * QR-003: リアルタイムQRコード検出
 * QR-005: 認識通知
 *
 * QRコード読み取り用のカスタムフック
 * 2段階スキャン対応（左QR → 右QR結合）
 */

import {
    extractJRAItemsFromQR,
    extractTicketNoFrom95DigitCode,
    isValidQRData,
    isPartialQRData,
    combineQRData,
    type JRAQRData,
} from '@/src/services/qr';
import * as Haptics from 'expo-haptics';
import { useCallback, useRef, useState } from 'react';

/**
 * スキャンフェーズ
 * scanning_first: 1枚目（左QR）をスキャン中
 * need_second: 2枚目（右QR）のスキャン待ち
 * complete: スキャン完了
 */
export type ScanPhase = 'scanning_first' | 'need_second' | 'complete';

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
  /** 現在のスキャンフェーズ */
  scanPhase: ScanPhase;
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
    scanPhase: 'scanning_first',
  });

  // 最後に読み取った時刻を記録（連続読み取り防止用）
  const lastScanTimeRef = useRef<number>(0);
  // 読み取った馬券番号を記録（重複防止用）
  const scannedTicketNosRef = useRef<Set<string>>(new Set());
  // 1枚目のQR生データを保持
  const firstQRDataRef = useRef<string | null>(null);
  // 読み取り間隔（ミリ秒）- 2秒間は同じQRコードを無視
  const SCAN_INTERVAL_MS = 2000;

  /**
   * スキャン完了時の共通処理
   */
  const completeWithData = useCallback((extracted: JRAQRData, rawData: string) => {
    // 馬券番号を記録（重複防止）
    const ticketNo = extractTicketNoFrom95DigitCode(rawData);
    if (ticketNo) {
      scannedTicketNosRef.current.add(ticketNo);
    }

    // QR-005: 認識通知（振動）
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setState({
      qrData: extracted,
      isComplete: true,
      hasError: false,
      errorMessage: null,
      scanPhase: 'complete',
    });
  }, []);

  /**
   * QRコードが検出されたときのコールバック
   *
   * @param data - QRコードから読み取った文字列データ
   */
  const handleQRScanned = useCallback((data: string) => {
    try {
      const now = Date.now();

      // 連続読み取り防止 - 一定時間内の読み取りは無視
      if (now - lastScanTimeRef.current < SCAN_INTERVAL_MS) {
        return;
      }

      // 数字列でない場合は無視
      if (!/^\d+$/.test(data) || data.length < 42) {
        console.log('[QR] 数字列ではない、または短すぎるため無視:', data.length, '桁');
        return;
      }

      // 重複チェック - 馬券番号（17-22桁）を抽出
      const ticketNo = extractTicketNoFrom95DigitCode(data);
      if (ticketNo && scannedTicketNosRef.current.has(ticketNo)) {
        console.log('[QR] 既に読み取った馬券番号のため無視:', ticketNo);
        return;
      }

      // 最後に読み取った時刻を更新
      lastScanTimeRef.current = now;

      console.log('[QR] QRコード検出:', data.substring(0, 50) + '...');

      // --- Phase判定 ---
      if (state.scanPhase === 'scanning_first') {
        // 1枚目（左QR）の処理
        const extracted = extractJRAItemsFromQR(data);
        console.log('[QR] 1枚目抽出結果:', extracted);

        if (isValidQRData(extracted)) {
          // 単純な馬券 → そのまま完了
          completeWithData(extracted, data);
        } else if (isPartialQRData(extracted)) {
          // base情報は有効だがextraが不完全 → 2枚目待ち
          firstQRDataRef.current = data;

          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

          setState({
            qrData: extracted,
            isComplete: false,
            hasError: false,
            errorMessage: null,
            scanPhase: 'need_second',
          });
          console.log('[QR] 2枚目のQRコードを待機中');
        } else {
          // base情報も不足 → エラー
          setState({
            qrData: extracted,
            isComplete: false,
            hasError: true,
            errorMessage: 'QRコードから必要な情報を読み取れませんでした',
            scanPhase: 'scanning_first',
          });
        }
      } else if (state.scanPhase === 'need_second') {
        // 2枚目（右QR）の処理
        if (!firstQRDataRef.current) {
          console.error('[QR] 1枚目のデータが見つかりません');
          return;
        }

        // 1枚目と同じデータが来た場合は無視（同じQRを2回読んだ）
        if (data === firstQRDataRef.current) {
          console.log('[QR] 1枚目と同じデータのため無視');
          return;
        }

        // 左QR + 右QRを結合
        const combined = combineQRData(firstQRDataRef.current, data);
        console.log('[QR] 結合データ長:', combined.length);

        const extracted = extractJRAItemsFromQR(combined);
        console.log('[QR] 結合後抽出結果:', extracted);

        if (isValidQRData(extracted)) {
          completeWithData(extracted, firstQRDataRef.current);
        } else {
          // 結合しても不完全
          setState(prev => ({
            ...prev,
            hasError: true,
            errorMessage: '2つのQRコードを結合しましたが、情報が不足しています',
          }));
        }
      }
    } catch (error) {
      console.error('[QR] QRコード処理エラー:', error);
      setState({
        qrData: null,
        isComplete: false,
        hasError: true,
        errorMessage: error instanceof Error ? error.message : 'QRコードの処理に失敗しました',
        scanPhase: state.scanPhase,
      });
    }
  }, [state.scanPhase, completeWithData]);

  /**
   * 状態をリセットする（最初からやり直し）
   */
  const reset = useCallback(() => {
    firstQRDataRef.current = null;
    setState({
      qrData: null,
      isComplete: false,
      hasError: false,
      errorMessage: null,
      scanPhase: 'scanning_first',
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
