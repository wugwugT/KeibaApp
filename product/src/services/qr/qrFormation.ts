/**
 * フォーメーションの抽出ロジック
 */

import type { BetType } from '@/src/types/betRecord';
import type { FormationSelection } from './qrTypes';

/**
 * フォーメーションの選択情報を抽出する
 * 
 * ルール:
 * - 43桁: 式別（1単勝、2複勝、3枠連、5馬連、6馬単、7ワイド、8三連複、9三連単）
 * - 44桁: 0固定
 * - 45-62桁: 1着目の選択（18桁、0=未選択、1=選択）
 * - 63-80桁: 2着目の選択（18桁、0=未選択、1=選択）
 * - 81-98桁: 3着目の選択（18桁、0=未選択、1=選択）
 * - 99-103桁: 金額（5桁、単位100円）
 * 
 * @param code - QRコードの数字列（extra部分、43桁以降）
 * @returns フォーメーションの選択情報またはnull
 */
export const extractFormationSelection = (code: string): FormationSelection | null => {
  if (code.length < 103) return null; // 最低限の長さチェック（式別1桁+固定0 1桁+54桁ブロック+金額5桁）
  
  // 式別（43桁目、extraの先頭）
  const betTypeCode = code.charAt(0);
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
  
  const betType = betTypeMap[betTypeCode];
  if (!betType) {
    return null;
  }
  
  // 44桁目が0であることを確認
  if (code.charAt(1) !== '0') {
    return null;
  }
  
  // 1着目: 45-62桁（extra内では2-19桁目）
  const firstPlaceSelections: number[] = [];
  for (let i = 2; i < 20; i++) {
    if (code.charAt(i) === '1') {
      firstPlaceSelections.push(i - 2 + 1); // 1-18に変換
    }
  }
  
  // 2着目: 63-80桁（extra内では20-37桁目）
  const secondPlaceSelections: number[] = [];
  for (let i = 20; i < 38; i++) {
    if (code.charAt(i) === '1') {
      secondPlaceSelections.push(i - 20 + 1); // 1-18に変換
    }
  }
  
  // 3着目: 81-98桁（extra内では38-55桁目）
  const thirdPlaceSelections: number[] = [];
  for (let i = 38; i < 56; i++) {
    if (code.charAt(i) === '1') {
      thirdPlaceSelections.push(i - 38 + 1); // 1-18に変換
    }
  }
  
  // 金額: 99-103桁（extra内では56-60桁目）
  const amountStr = code.substring(56, 61);
  const baseInvestment = parseInt(amountStr + '00', 10);
  
  // パターン数（買い目点数）の計算
  let patternCount = 0;
  
  switch (betType) {
    case '3連単':
      // 三連単: 1着、2着、3着の順列（重複なし）
      for (const h1 of firstPlaceSelections) {
        for (const h2 of secondPlaceSelections) {
          if (h1 === h2) continue;
          for (const h3 of thirdPlaceSelections) {
            if (h3 !== h1 && h3 !== h2) {
              patternCount++;
            }
          }
        }
      }
      break;
      
    case '3連複':
      // 三連複: 1着、2着、3着の組み合わせ（順序不問、重複なし）
      const comboSet3 = new Set<string>();
      for (const h1 of firstPlaceSelections) {
        for (const h2 of secondPlaceSelections) {
          if (h1 === h2) continue;
          for (const h3 of thirdPlaceSelections) {
            if (h3 !== h1 && h3 !== h2) {
              // 組み合わせをソートして重複を排除
              const combo = [h1, h2, h3].sort((a, b) => a - b).join(',');
              comboSet3.add(combo);
            }
          }
        }
      }
      patternCount = comboSet3.size;
      break;
      
    case '馬単':
      // 馬単: 1着、2着の順列（重複なし）
      for (const h1 of firstPlaceSelections) {
        for (const h2 of secondPlaceSelections) {
          if (h1 !== h2) {
            patternCount++;
          }
        }
      }
      break;
      
    case '枠連':
    case '馬連':
    case 'ワイド':
      // 枠連・馬連・ワイド: 1着、2着の組み合わせ（順序不問、重複なし）
      const comboSet2 = new Set<string>();
      for (const h1 of firstPlaceSelections) {
        for (const h2 of secondPlaceSelections) {
          if (h1 !== h2) {
            // 組み合わせをソートして重複を排除
            const combo = [h1, h2].sort((a, b) => a - b).join(',');
            comboSet2.add(combo);
          }
        }
      }
      patternCount = comboSet2.size;
      break;
      
    default:
      // 単勝・複勝などはフォーメーションとして通常存在しないが、念のため1着数とする
      patternCount = firstPlaceSelections.length;
      break;
  }
  
  return {
    first_place_selections: firstPlaceSelections,
    second_place_selections: secondPlaceSelections,
    third_place_selections: thirdPlaceSelections,
    investment: baseInvestment * patternCount,
  };
};
