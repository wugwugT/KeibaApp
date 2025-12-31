/**
 * ながしの抽出ロジック
 */

import type { NagashiSelection } from './qrTypes';

/**
 * ながしの選択情報を抽出する
 * 
 * 44:式別（1-9、機番が9桁のため、44桁目から開始）
 * 45:ながしのタイプ
 *   - 1: 軸2頭ながし 軸-軸-相手（3連単など）
 *   - 2: 2着ながし（馬単など）
 *   - 3: 軸2頭ながし（3連複など）
 *   - 4: 軸1頭ながし 軸-相手-相手（3連単など）
 *   - 6: 軸1頭ながし 相手-相手-軸（3連単など）
 *   - 7: 軸1頭ながし（3連複など）
 * 46-63桁: 1着目の選択（18桁、1桁ずつ、1=選択あり）
 * 64-81桁: 2着目の選択（18桁、1桁ずつ、1=選択あり）
 * 82-99桁: 3着目の選択（18桁、1桁ずつ、1=選択あり）
 * 100-104桁: 金額（5桁、単位100円）
 * 105桁: マルチフラグ（0または1）
 * 
 * @param code - QRコードの数字列
 * @returns ながしの選択情報またはnull
 */
export const extractNagashiSelection = (code: string): NagashiSelection | null => {
  if (!code || code.length < 70) return null;

  const betTypeCode = code.charAt(42); 
  const nagashiType = parseInt(code.charAt(43), 10);
  
  // ビットマップ抽出用（引数で開始位置を動的に変える）
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
  let patternCount = 0;
  let isMulti = false;
  let baseInvestment = 0;

  // --- 【パターン A】三連複(8)・三連単(9) ---
  // データが長く、45桁目から18ビット×3エリアの巨大な構造
  if (betTypeCode === '8' || betTypeCode === '9') {
    if (code.length < 105) return null;
    
    isMulti = code.charAt(103) === '1' || code.charAt(104) === '1';
    baseInvestment = parseInt(code.substring(98, 103) + '00', 10);

    const area1 = extractFromBitmap(44); 
    const area2 = extractFromBitmap(62);
    const area3 = extractFromBitmap(80);

    if (betTypeCode === '9') { // 三連単
      if (nagashiType === 1) { // 軸2頭
        axis1 = area1; axis2 = area2;
        opponents = area3.filter(n => !axis1.includes(n) && !axis2.includes(n));
        patternCount = isMulti ? (opponents.length * 6) : opponents.length;
      } else { // 軸1頭 (4 or 6)
        axis1 = (nagashiType === 4) ? area1 : area3;
        const pool = (nagashiType === 4) ? [...area2, ...area3] : [...area1, ...area2];
        opponents = Array.from(new Set(pool)).filter(n => !axis1.includes(n));
        patternCount = isMulti ? ((opponents.length * (opponents.length - 1) / 2) * 6) : (opponents.length * (opponents.length - 1));
      }
    } else { // 三連複
      axis1 = area1;
      if (nagashiType === 3) { // 軸2頭
        axis2 = area2;
        opponents = area3.filter(n => !axis1.includes(n) && !axis2.includes(n));
        patternCount = opponents.length;
      } else { // 軸1頭 (7)
        opponents = Array.from(new Set([...area2, ...area3])).filter(n => !axis1.includes(n));
        patternCount = (opponents.length * (opponents.length - 1)) / 2;
      }
    }
  } 
  // --- 【パターン B】枠連(3)・馬連(5)・馬単(6)・ワイド(7) ---
  // 構造がコンパクト：[43:式別][44:軸][45-46:軸馬2桁][47-51:金額][52-69:相手ビットマップ]
  else {
    // 軸馬を数値2桁で取得（45-46桁目 = index 44-46）
    const axisHorse = parseInt(code.substring(44, 46), 10);
    if (!isNaN(axisHorse) && axisHorse > 0) {
      axis1 = [axisHorse];
    }

    // 金額を取得（47-51桁目 = index 46-51）
    const amtStr = code.substring(46, 51);
    baseInvestment = parseInt(amtStr + '00', 10);

    // 相手ビットマップを取得（52-69桁目 = index 51から18個）
    opponents = extractFromBitmap(51);

    // 馬単マルチ判定（必要であれば）
    isMulti = false; 
    
    // ながしなので、相手の数がそのまま点数
    patternCount = opponents.length;
  }

  return {
    axis1_selections: axis1,
    axis2_selections: axis2,
    opponent_selections: opponents,
    investment: baseInvestment * patternCount,
    is_multi: isMulti,
  };
};

