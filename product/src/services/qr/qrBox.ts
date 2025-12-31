/**
 * ボックスの抽出ロジック
 */

import type { BoxSelection } from './qrTypes';

/**
 * ボックスの選択情報を抽出する
 * 
 * 44:式別（機番が9桁のため、44桁目から開始）
 * 45-46:1つ目の馬番
 * 47-48:2つ目の馬番
 * ...
 * 67-71:購入金額（単位100円）
 * 
 * @param code - QRコードの数字列
 * @returns ボックスの選択情報またはnull
 */
export const extractBoxSelection = (code: string): BoxSelection | null => {
  if (code.length < 71) return null;
  
  // 式別（44桁、機番が9桁のため+3シフト）
  const betTypeCode = code.charAt(43);
  if (!betTypeCode || !['1', '2', '3', '5', '6', '7', '8', '9'].includes(betTypeCode)) {
    return null;
  }
  
  // 選択した馬番を抽出（45-66桁、2桁ずつ、+3シフト）
  const selections: number[] = [];
  for (let i = 44; i < 66; i += 2) {
    const horseStr = code.substring(i, i + 2);
    const horse = parseInt(horseStr, 10);
    if (!isNaN(horse) && horse > 0 && horse <= 18) {
      selections.push(horse);
    } else if (horse === 0) {
      // 00の場合は終了
      break;
    }
  }
  
  if (selections.length === 0) return null;
  
  // 金額（67-71桁、単位100円、+3シフト）
  // Dartコードに基づき、5桁の文字列の末尾に"00"を追加してから整数化
  const amountStr = code.substring(66, 71);
  const amountWithSuffix = amountStr + '00';
  const investment = parseInt(amountWithSuffix, 10);
  
  return {
    selections: selections,
    investment: investment,
  };
};

