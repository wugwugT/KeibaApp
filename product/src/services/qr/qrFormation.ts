/**
 * フォーメーションの抽出ロジック
 */

import type { FormationSelection } from './qrTypes';

/**
 * フォーメーションの選択情報を抽出する
 * 
 * 44:式別（機番が9桁のため、44桁目から開始）
 * 45:0固定
 * 46-99:各着順の選択有無（1桁ずつ、0=選択無し、1=選択あり）
 * 100-104:購入金額（単位100円）
 * 
 * @param code - QRコードの数字列
 * @returns フォーメーションの選択情報またはnull
 */
export const extractFormationSelection = (code: string): FormationSelection | null => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/e67fc349-a245-4c88-ae2f-a1c721dd6e3d', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'qrFormation.ts:24',
      message: 'extractFormationSelection entry',
      data: {
        codeLength: code.length,
        code43: code.charAt(42), // 式別
        code44: code.charAt(43), // 0固定
        code43_51: code.substring(42, 50)
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'post-fix',
      hypothesisId: 'D'
    })
  }).catch(() => {});
  // #endregion

  if (code.length < 103) return null;

  // 式別（43桁目 / index 42）
  const betTypeCode = code.charAt(42);
  const validTypes = ['1', '2', '3', '5', '6', '7', '8', '9'];

  if (!betTypeCode || !validTypes.includes(betTypeCode)) {
    return null;
  }

  // 44桁目（index 43）が0であることを確認
  if (code.charAt(43) !== '0') {
    return null;
  }

  // --- 馬番・枠番の抽出 ---
  // 1着目: 45-62桁 (index 44-61)
  const firstPlaceSelections: number[] = [];
  for (let i = 44; i < 62; i++) {
    if (code.charAt(i) === '1') firstPlaceSelections.push(i - 44 + 1);
  }

  // 2着目: 63-80桁 (index 62-79)
  const secondPlaceSelections: number[] = [];
  for (let i = 62; i < 80; i++) {
    if (code.charAt(i) === '1') secondPlaceSelections.push(i - 62 + 1);
  }

  // 3着目: 81-98桁 (index 80-97)
  const thirdPlaceSelections: number[] = [];
  for (let i = 80; i < 98; i++) {
    if (code.charAt(i) === '1') thirdPlaceSelections.push(i - 80 + 1);
  }

  // --- 金額の抽出 ---
  // 99-103桁 (index 98-102)
  const amountStr = code.substring(98, 103);
  const baseInvestment = parseInt(amountStr + '00', 10);

  // --- パターン数（買い目点数）の計算 ---
  let patternCount = 0;

  switch (betTypeCode) {
    case '9': // 三連単
      for (const h1 of firstPlaceSelections) {
        for (const h2 of secondPlaceSelections) {
          if (h1 === h2) continue;
          for (const h3 of thirdPlaceSelections) {
            if (h3 !== h1 && h3 !== h2) patternCount++;
          }
        }
      }
      break;

    case '8': // 三連複
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

    case '6': // 馬単
      for (const h1 of firstPlaceSelections) {
        for (const h2 of secondPlaceSelections) {
          if (h1 !== h2) patternCount++;
        }
      }
      break;

    case '3': // 枠連
    case '5': // 馬連
    case '7': // ワイド
      const comboSet2 = new Set<string>();
      for (const h1 of firstPlaceSelections) {
        for (const h2 of secondPlaceSelections) {
          if (h1 !== h2) {
            // 組み合わせをソートして重複を排除 (1-2 と 2-1 を同一視)
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

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/e67fc349-a245-4c88-ae2f-a1c721dd6e3d', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'qrFormation.ts:130',
      message: 'formation calculation result',
      data: {
        betTypeCode,
        patternCount,
        baseInvestment,
        totalInvestment: baseInvestment * patternCount,
        selections: {
          first: firstPlaceSelections,
          second: secondPlaceSelections,
          third: thirdPlaceSelections
        }
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'post-fix',
      hypothesisId: 'D'
    })
  }).catch(() => {});
  // #endregion

  return {
    first_place_selections: firstPlaceSelections,
    second_place_selections: secondPlaceSelections,
    third_place_selections: thirdPlaceSelections,
    investment: baseInvestment * patternCount,
  };
};

