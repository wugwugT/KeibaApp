/**
 * QRコード読み取りサービス
 * QR-003, QR-004のエントリーポイント
 */

import type { BarcodeSettings } from 'expo-camera';

export {
    extractBetTypeFrom95DigitCode, extractDayFrom95DigitCode,
    extractJRAItemsFromQR, extractRoundFrom95DigitCode, extractTicketNoFrom95DigitCode, extractYearFrom95DigitCode, isValidQRData,
    QR_CODE_TYPES,
    type JRAQRData
} from './qrScanner';

/**
 * CameraView用のバーコードスキャン設定を取得する
 * 
 * @returns CameraViewのbarcodeScannerSettingsプロップに渡す設定
 */
export const getQRBarcodeSettings = (): BarcodeSettings => {
  return {
    barcodeTypes: ['qr'],
  };
};

