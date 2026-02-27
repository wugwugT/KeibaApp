/**
 * QR-003: リアルタイムQRコード検出
 * QR-004: JRA項目抽出
 * 
 * QRコード読み取りとJRA項目抽出のメインロジック
 */

import type { BetType } from '@/src/types/betRecord';
import type { JRAQRData } from './qrTypes';
import {
  extractPlaceFrom95DigitCode,
  extractRaceNoFrom95DigitCode,
  extractYearFrom95DigitCode,
  extractRoundFrom95DigitCode,
  extractDayFrom95DigitCode,
  extractBuyMethodFrom95DigitCode,
  extractTicketNoFrom95DigitCode,
  extractSalesLocationFrom95DigitCode,
  extractBetTypeFrom95DigitCode,
  separateBaseAndExtra,
  detectPaddingStart,
  getBaseLength,
  estimateRaceDate,
} from './qrExtractors';
import { lookupRaceDate } from './jraCalendar';
import { extractNormalEntries } from './qrNormalEntries';
import { extractBoxSelection } from './qrBox';
import { extractNagashiSelection } from './qrNagashi';
import { extractFormationSelection } from './qrFormation';

// 型定義と定数を再エクスポート
export type { NormalBetEntry, FormationSelection, NagashiSelection, BoxSelection, JRAQRData } from './qrTypes';
export { QR_CODE_TYPES } from './qrTypes';

// 抽出関数を再エクスポート
export {
  extractBetTypeFrom95DigitCode,
  extractYearFrom95DigitCode,
  extractRoundFrom95DigitCode,
  extractDayFrom95DigitCode,
  extractTicketNoFrom95DigitCode,
  detectRacingType,
  getBaseLength,
  estimateRaceDate,
} from './qrExtractors';

/**
 * QRコードからJRA項目を抽出する
 * 
 * JRA馬券のQRコードは数字列で、先頭42桁（base）と43桁以降（extra）に分かれる
 * extra部分にはパディングが含まれる可能性があるため、パディングを除去してから処理する
 * 
 * @param qrData - QRコードから読み取った文字列データ
 * @returns 抽出されたJRA項目
 */
export const extractJRAItemsFromQR = (qrData: string): JRAQRData => {
  const result: JRAQRData = {
    place: null,
    race_no: null,
    year: null,
    round: null,
    day: null,
    buy_method: null,
    ticket_no: null,
    sales_location: null,
    normal_entries: null,
    formation_selection: null,
    nagashi_selection: null,
    box_selection: null,
    total_investment: null,
    // 後方互換性のため
    bet_type: null,
    horse_no: null,
    investment: null,
    rawData: qrData,
  };

  try {
    // 数字列形式（JRA馬券の標準形式）をチェック
    // 右側のQRコードなど、数字列でない場合は無視
    if (!/^\d+$/.test(qrData)) {
      return result;
    }
    
    // 最低限の長さチェック（1-42桁の情報を取得するため）
    if (qrData.length < 42) {
      return result;
    }
    
    // base（1-42桁）とextra（43桁以降）を分離し、パディングを除去
    const { base, extra } = separateBaseAndExtra(qrData);
    
    // base（1-42桁）の情報を抽出
    result.place = extractPlaceFrom95DigitCode(base);
    result.race_no = extractRaceNoFrom95DigitCode(base);
    result.year = extractYearFrom95DigitCode(base);
    result.round = extractRoundFrom95DigitCode(base);
    result.day = extractDayFrom95DigitCode(base);

    // カレンダー照合で日付を推定
    const estimatedDate = lookupRaceDate(result.place, result.year, result.round, result.day);
    if (estimatedDate) {
      result.estimatedDate = estimatedDate;
    }

    result.buy_method = extractBuyMethodFrom95DigitCode(base);
    result.ticket_no = extractTicketNoFrom95DigitCode(base); // 17-22桁（発券通番）
    result.sales_location = extractSalesLocationFrom95DigitCode(base); // 29-32桁
    
    // extra（43桁以降、パディング除去済み）の買い方に応じた抽出
    if (extra.length > 0) {
      const buyMethod = result.buy_method;
      
      if (buyMethod === 0 || buyMethod === 5) {
        // 通常（0）または応援馬券（5）
        const entries = extractNormalEntries(extra, buyMethod);
        result.normal_entries = entries;
        result.total_investment = entries.reduce((sum, e) => sum + e.investment, 0);
        // 後方互換性のため、一口目の情報を設定
        if (entries.length > 0) {
          result.bet_type = entries[0].bet_type;
          result.horse_no = entries[0].first_place;
          result.investment = entries[0].investment;
        }
      } else if (buyMethod === 1) {
        // ボックス
        const boxSelection = extractBoxSelection(extra);
        result.box_selection = boxSelection;
        result.total_investment = boxSelection ? boxSelection.investment : null;
        // 後方互換性のため
        if (boxSelection) {
          result.bet_type = boxSelection.bet_type;
          result.investment = boxSelection.investment;
        }
      } else if (buyMethod === 2) {
        // ながし
        const nagashiSelection = extractNagashiSelection(extra);
        result.nagashi_selection = nagashiSelection;
        result.total_investment = nagashiSelection ? nagashiSelection.investment : null;
        // 後方互換性のため
        if (nagashiSelection) {
          result.bet_type = nagashiSelection.bet_type;
          result.investment = nagashiSelection.investment;
        }
      } else if (buyMethod === 3) {
        // フォーメーション
        const formationSelection = extractFormationSelection(extra);
        result.formation_selection = formationSelection;
        result.total_investment = formationSelection ? formationSelection.investment : null;
        // 後方互換性のため
        if (formationSelection) {
          // フォーメーションの場合、式別を設定（extraの先頭）
          result.bet_type = extractBetTypeFrom95DigitCode('0'.repeat(42) + extra);
          result.investment = formationSelection.investment;
        }
      }
      // クイックピック（4）は考慮外
    }
  } catch (error) {
    console.error('[QR] Error parsing QR data:', error);
  }

  return result;
};

/**
 * QRコード検出結果が有効かどうかを判定する
 * 
 * @param data - 抽出されたJRA項目
 * @returns 必須項目（場名、レース番号、投資額）が揃っているか
 */
export const isValidQRData = (data: JRAQRData): boolean => {
  // 基本的な情報が揃っているかチェック
  if (data.place === null || data.race_no === null) {
    return false;
  }
  
  // 買い方に応じて、必要な情報が揃っているかチェック
  if (data.buy_method === 0 || data.buy_method === 5) {
    // 通常・応援馬券の場合
    return data.normal_entries !== null && data.normal_entries.length > 0 && data.total_investment !== null;
  } else if (data.buy_method === 1) {
    // ボックスの場合
    return data.box_selection !== null && data.total_investment !== null;
  } else if (data.buy_method === 2) {
    // ながしの場合
    return data.nagashi_selection !== null && data.total_investment !== null;
  } else if (data.buy_method === 3) {
    // フォーメーションの場合
    return data.formation_selection !== null && data.total_investment !== null;
  }
  
  // クイックピック（4）は考慮外
  return false;
};

/**
 * 右QRのチェックデジット長（末尾5桁）
 */
const RIGHT_QR_CHECK_DIGIT_LENGTH = 5;

/**
 * 左QRと右QRのデータを結合する
 *
 * 右QRからチェックデジット(末尾5桁)を除去し、パディングを除去した上で
 * 左QRの末尾に連結する。
 *
 * @param leftQR - 左QRコードの数字列
 * @param rightQR - 右QRコードの数字列
 * @returns 結合された数字列
 */
export const combineQRData = (leftQR: string, rightQR: string): string => {
  // 右QRからチェックデジット(末尾5桁)を除去
  const rightWithoutCheck = rightQR.substring(0, rightQR.length - RIGHT_QR_CHECK_DIGIT_LENGTH);
  // パディング除去
  const paddingStart = detectPaddingStart(rightWithoutCheck, 0);
  const rightExtra = paddingStart >= 0
    ? rightWithoutCheck.substring(0, paddingStart)
    : rightWithoutCheck;
  return leftQR + rightExtra;
};

/**
 * 左QRデータが不完全（右QRとの結合が必要）かどうかを判定する
 *
 * base情報（place, race_no）が有効だが、extra部分のデータが不完全な場合にtrueを返す。
 * フォーメーション・ボックス・ながしで、extraが必要な長さに満たない場合を検出する。
 *
 * @param data - 抽出されたJRA項目
 * @returns 不完全なデータかどうか
 */
export const isPartialQRData = (data: JRAQRData): boolean => {
  // base情報が有効でなければ「不完全」ではなく「無効」
  if (data.place === null || data.race_no === null) {
    return false;
  }

  // 買い方が取得できていて、extra部分の解析結果が空の場合は不完全
  const buyMethod = data.buy_method;
  if (buyMethod === 3 && data.formation_selection === null) {
    return true;
  }
  if (buyMethod === 1 && data.box_selection === null) {
    return true;
  }
  if (buyMethod === 2 && data.nagashi_selection === null) {
    return true;
  }
  if ((buyMethod === 0 || buyMethod === 5) && (data.normal_entries === null || data.normal_entries.length === 0)) {
    return true;
  }

  return false;
};
