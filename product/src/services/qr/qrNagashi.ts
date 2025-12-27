/**
 * ながしの抽出ロジック
 * 式別は43-44桁（2桁）で処理
 */

import type { BetType } from '@/src/types/betRecord';
import type { NagashiSelection } from './qrTypes';

/**
 * ながしの選択情報を抽出する
 * 
 * ルール:
 * - 43-44桁: 式別（2桁）
 *   83: 三連複 軸2頭ながし
 *   87: 三連複 軸1頭ながし
 *   91: 三連単 軸2頭（軸-軸-相手）
 *   92: 三連単 軸2頭（相手-軸-軸）
 *   93: 三連単 軸2頭（軸-相手-軸）
 *   94: 三連単 軸1頭（軸-相手-相手）
 *   95: 三連単 軸1頭（相手-軸-相手）
 *   96: 三連単 軸1頭（相手-相手-軸）
 *   61: 馬単 1着ながし（軸-相手）
 *   62: 馬単 2着ながし（相手-軸）
 * 
 * - 45桁以降: 馬番選択領域（18桁×Nブロック）
 *   0 = 未選択、1 = 選択された馬番
 * 
 * 構成ブロック数:
 * - 三連複軸2頭ながし / 三連単軸2頭ながし: [軸1ブロック] + [軸2ブロック] + [相手ブロック] = 18×3 = 54桁
 * - 三連複軸1頭ながし / 馬単1着ながし / 馬単2着ながし: [選択ブロック1] + [空ブロック] + [選択ブロック2] = 18×3 = 54桁
 * - 三連単軸1頭ながし: [軸ブロック] + [相手ブロック] + [相手ブロック] = 18×3 = 54桁
 * 
 * - 金額: 5桁（単位100円）
 * - マルチフラグ: 1桁（馬単・三連単のみ、0=マルチなし、1=マルチあり）
 * 
 * @param code - QRコードの数字列（extra部分、43桁以降）
 * @returns ながしの選択情報またはnull
 */
export const extractNagashiSelection = (code: string): NagashiSelection | null => {
  if (code.length < 100) return null; // 最低限の長さチェック（式別2桁+54桁ブロック+金額5桁+マルチ1桁）
  
  // 式別（43-44桁、extraの先頭2桁）
  const betTypeCode = code.substring(0, 2);
  
  const betTypeMap: Record<string, { betType: BetType; pattern: string }> = {
    '83': { betType: '3連複', pattern: 'axis2' }, // 軸2頭ながし
    '87': { betType: '3連複', pattern: 'axis1' }, // 軸1頭ながし
    '91': { betType: '3連単', pattern: 'axis2_1' }, // 軸2頭（軸-軸-相手）
    '92': { betType: '3連単', pattern: 'axis2_2' }, // 軸2頭（相手-軸-軸）
    '93': { betType: '3連単', pattern: 'axis2_3' }, // 軸2頭（軸-相手-軸）
    '94': { betType: '3連単', pattern: 'axis1_1' }, // 軸1頭（軸-相手-相手）
    '95': { betType: '3連単', pattern: 'axis1_2' }, // 軸1頭（相手-軸-相手）
    '96': { betType: '3連単', pattern: 'axis1_3' }, // 軸1頭（相手-相手-軸）
    '61': { betType: '馬単', pattern: 'uma1' }, // 1着ながし（軸-相手）
    '62': { betType: '馬単', pattern: 'uma2' }, // 2着ながし（相手-軸）
  };
  
  const typeInfo = betTypeMap[betTypeCode];
  if (!typeInfo) {
    return null;
  }
  
  const { betType, pattern } = typeInfo;
  
  // ビットマップ抽出用（18桁ブロックから選択馬番を抽出）
  const extractFromBitmap = (startPos: number): number[] => {
    const res: number[] = [];
    if (code.length < startPos + 18) return res;
    for (let i = 0; i < 18; i++) {
      if (code.charAt(startPos + i) === '1') {
        res.push(i + 1);
      }
    }
    return res;
  };
  
  let axis1: number[] = [];
  let axis2: number[] = [];
  let opponents: number[] = [];
  let isMulti = false;
  let baseInvestment = 0;
  let amountStartPos = 0;
  
  // ブロック構造の解析
  if (pattern === 'axis2') {
    // 三連複軸2頭ながし: [軸1ブロック] + [軸2ブロック] + [相手ブロック]
    axis1 = extractFromBitmap(2); // 45桁目から（extra内では2桁目から）
    axis2 = extractFromBitmap(20); // 63桁目から
    const area3 = extractFromBitmap(38); // 81桁目から
    opponents = area3.filter(n => !axis1.includes(n) && !axis2.includes(n));
    amountStartPos = 56; // 99桁目から（extra内では56桁目から）
  } else if (pattern === 'axis1') {
    // 三連複軸1頭ながし: [選択ブロック1] + [空ブロック] + [選択ブロック2]
    axis1 = extractFromBitmap(2); // 45桁目から
    const area3 = extractFromBitmap(38); // 81桁目から
    opponents = Array.from(new Set(area3)).filter(n => !axis1.includes(n));
    amountStartPos = 56; // 99桁目から
  } else if (pattern.startsWith('axis2_')) {
    // 三連単軸2頭ながし
    const area1 = extractFromBitmap(2); // 45桁目から
    const area2 = extractFromBitmap(20); // 63桁目から
    const area3 = extractFromBitmap(38); // 81桁目から
    
    if (pattern === 'axis2_1') {
      // 軸-軸-相手
      axis1 = area1;
      axis2 = area2;
      opponents = area3.filter(n => !axis1.includes(n) && !axis2.includes(n));
    } else if (pattern === 'axis2_2') {
      // 相手-軸-軸
      axis1 = area2;
      axis2 = area3;
      opponents = area1.filter(n => !axis1.includes(n) && !axis2.includes(n));
    } else if (pattern === 'axis2_3') {
      // 軸-相手-軸
      axis1 = area1;
      axis2 = area3;
      opponents = area2.filter(n => !axis1.includes(n) && !axis2.includes(n));
    }
    amountStartPos = 56; // 99桁目から
  } else if (pattern.startsWith('axis1_')) {
    // 三連単軸1頭ながし
    const area1 = extractFromBitmap(2); // 45桁目から
    const area2 = extractFromBitmap(20); // 63桁目から
    const area3 = extractFromBitmap(38); // 81桁目から
    
    if (pattern === 'axis1_1') {
      // 軸-相手-相手
      axis1 = area1;
      opponents = Array.from(new Set([...area2, ...area3])).filter(n => !axis1.includes(n));
    } else if (pattern === 'axis1_2') {
      // 相手-軸-相手
      axis1 = area2;
      opponents = Array.from(new Set([...area1, ...area3])).filter(n => !axis1.includes(n));
    } else if (pattern === 'axis1_3') {
      // 相手-相手-軸
      axis1 = area3;
      opponents = Array.from(new Set([...area1, ...area2])).filter(n => !axis1.includes(n));
    }
    amountStartPos = 56; // 99桁目から
  } else if (pattern === 'uma1' || pattern === 'uma2') {
    // 馬単1着ながし / 2着ながし: [選択ブロック1] + [空ブロック] + [選択ブロック2]
    const area1 = extractFromBitmap(2); // 45桁目から
    const area3 = extractFromBitmap(38); // 81桁目から
    
    if (pattern === 'uma1') {
      // 1着ながし（軸-相手）
      axis1 = area1;
      opponents = area3.filter(n => !axis1.includes(n));
    } else {
      // 2着ながし（相手-軸）
      axis1 = area3;
      opponents = area1.filter(n => !axis1.includes(n));
    }
    amountStartPos = 56; // 99桁目から
  }
  
  // 金額（5桁、単位100円）
  if (amountStartPos + 5 <= code.length) {
    const amountStr = code.substring(amountStartPos, amountStartPos + 5);
    baseInvestment = parseInt(amountStr + '00', 10);
  } else {
    return null;
  }
  
  // マルチフラグ（馬単・三連単のみ）
  if (betType === '馬単' || betType === '3連単') {
    if (amountStartPos + 6 <= code.length) {
      isMulti = code.charAt(amountStartPos + 5) === '1';
    }
  }
  
  // 投資額の計算（パターン数 × 基本投資額）
  // パターン数の計算は複雑なため、ここでは簡易的に処理
  // 実際のパターン数は、軸と相手の組み合わせにより異なる
  let patternCount = 1;
  
  if (betType === '3連複') {
    if (axis2.length > 0) {
      // 軸2頭の場合
      patternCount = opponents.length;
    } else {
      // 軸1頭の場合
      patternCount = (opponents.length * (opponents.length - 1)) / 2;
    }
  } else if (betType === '3連単') {
    if (axis2.length > 0) {
      // 軸2頭の場合
      patternCount = opponents.length;
      if (isMulti) patternCount *= 6; // マルチの場合、順序の組み合わせ
    } else {
      // 軸1頭の場合
      patternCount = opponents.length * (opponents.length - 1);
      if (isMulti) patternCount *= 6;
    }
  } else if (betType === '馬単') {
    patternCount = opponents.length;
    if (isMulti) patternCount *= 2; // マルチの場合、裏も含む
  }
  
  return {
    bet_type: betType,
    axis1_selections: axis1,
    axis2_selections: axis2,
    opponent_selections: opponents,
    investment: baseInvestment * patternCount,
    is_multi: isMulti,
  };
};
