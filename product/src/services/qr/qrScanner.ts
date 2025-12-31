/**
 * QR-003: リアルタイムQRコード検出
 * QR-004: JRA項目抽出
 * 
 * QRコード読み取りとJRA項目抽出のメインロジック
 */

import type { BetType } from '@/src/types/betRecord';
import type { JRAQRData } from './qrTypes';
import { extractPlaceFrom95DigitCode, extractRaceNoFrom95DigitCode, extractYearFrom95DigitCode, extractRoundFrom95DigitCode, extractDayFrom95DigitCode, extractBuyMethodFrom95DigitCode, extractTicketNoFrom95DigitCode, extractSalesLocationFrom95DigitCode, extractMachineCodeFrom95DigitCode, extractBetTypeFrom95DigitCode } from './qrExtractors';
import { extractNormalEntries } from './qrNormalEntries';
import { extractBoxSelection } from './qrBox';
import { extractNagashiSelection } from './qrNagashi';
import { extractFormationSelection } from './qrFormation';

// 型定義と定数を再エクスポート
export type { NormalBetEntry, FormationSelection, NagashiSelection, BoxSelection, JRAQRData } from './qrTypes';
export { QR_CODE_TYPES } from './qrTypes';

// 抽出関数を再エクスポート
export { extractBetTypeFrom95DigitCode, extractYearFrom95DigitCode, extractRoundFrom95DigitCode, extractDayFrom95DigitCode, extractTicketNoFrom95DigitCode } from './qrExtractors';

/**
 * QRコードからJRA項目を抽出する
 * 
 * JRA馬券のQRコードは95桁の数字列で、先頭43桁が重要な情報を含む
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
    machine_code: null,
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
    
    // 最低限の長さチェック（1-41桁の情報を取得するため）
    if (qrData.length < 42) {
      return result;
    }
    
    // 1-41桁の情報を抽出
    result.place = extractPlaceFrom95DigitCode(qrData);
    result.race_no = extractRaceNoFrom95DigitCode(qrData);
    result.year = extractYearFrom95DigitCode(qrData);
    result.round = extractRoundFrom95DigitCode(qrData);
    result.day = extractDayFrom95DigitCode(qrData);
    result.buy_method = extractBuyMethodFrom95DigitCode(qrData);
    result.ticket_no = extractTicketNoFrom95DigitCode(qrData); // 17-22桁（発券通番）
    result.sales_location = extractSalesLocationFrom95DigitCode(qrData); // 29-32桁
    result.machine_code = extractMachineCodeFrom95DigitCode(qrData); // 35-43桁
    
    // 43桁以降の買い方に応じた抽出
    if (qrData.length >= 46) {
      const buyMethod = result.buy_method;
      
      if (buyMethod === 0 || buyMethod === 5) {
        // 通常（0）または応援馬券（5）
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/e67fc349-a245-4c88-ae2f-a1c721dd6e3d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'qrScanner.ts:78',message:'extracting normal entries',data:{buyMethod,qrDataLength:qrData.length,qrData43_60:qrData.substring(43,61)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        const entries = extractNormalEntries(qrData);
        result.normal_entries = entries;
        result.total_investment = entries.reduce((sum, e) => sum + e.investment, 0);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/e67fc349-a245-4c88-ae2f-a1c721dd6e3d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'qrScanner.ts:82',message:'normal entries result',data:{entryCount:entries.length,totalInvestment:result.total_investment,entries:entries.map(e=>({bet_type:e.bet_type,investment:e.investment}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        // 後方互換性のため、一口目の情報を設定
        if (entries.length > 0) {
          result.bet_type = entries[0].bet_type;
          result.horse_no = entries[0].first_place;
          result.investment = entries[0].investment;
        }
      } else if (buyMethod === 1) {
        // ボックス
        const boxSelection = extractBoxSelection(qrData);
        result.box_selection = boxSelection;
        result.total_investment = boxSelection ? boxSelection.investment : null;
      } else if (buyMethod === 2) {
        // ながし
        const nagashiSelection = extractNagashiSelection(qrData);
        result.nagashi_selection = nagashiSelection;
        result.total_investment = nagashiSelection ? nagashiSelection.investment : null;
        // ながしの場合、式別を設定（43桁目から開始）
        if (qrData.length >= 43) {
          const betTypeCode = qrData.charAt(42);
          const betTypeMap: Record<string, BetType> = {
            '1': '単勝',
            '2': '複勝',
            '3': '枠連',
            '5': '馬連',
            '6': '馬単',
            '7': 'ワイド',
            '8': '3連複',
            '9': '3連単',
          };
          result.bet_type = betTypeMap[betTypeCode] || null;
        }
      } else if (buyMethod === 3) {
        // フォーメーション
        const formationSelection = extractFormationSelection(qrData);
        result.formation_selection = formationSelection;
        result.total_investment = formationSelection ? formationSelection.investment : null;
        // フォーメーションの場合、式別を設定（43桁目から開始）
        if (qrData.length >= 43) {
          const betTypeCode = qrData.charAt(42);
          const betTypeMap: Record<string, BetType> = {
            '1': '単勝',
            '2': '複勝',
            '3': '枠連',
            '5': '馬連',
            '6': '馬単',
            '7': 'ワイド',
            '8': '3連複',
            '9': '3連単',
          };
          result.bet_type = betTypeMap[betTypeCode] || null;
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
