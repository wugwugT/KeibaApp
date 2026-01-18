/**
 * ボックスの抽出ロジック
 * パディング整合性チェックにより金額位置を特定
 */

import type { BetType } from '@/src/types/betRecord';
import type { BoxSelection } from './qrTypes';
import { detectPaddingStart } from './qrExtractors';

/**
 * ボックスの選択情報を抽出する
 * 
 * ルール:
 * - 43桁: 式別（1単勝、2複勝、3枠連、5馬連、6馬単、7ワイド、8三連複、9三連単）
 * - 44桁以降: 馬番エリア（可変長、5-18個セット）
 * - 金額の5桁を特定するために、パディング整合性チェックを必須とする
 * 
 * パディング整合性チェック:
 * 1. 候補位置の算出: 「44桁目 + (2 × セット数)」を金額の開始位置と仮定（セット数は5から18まで順に検証）
 * 2. パディングの完全一致確認: 仮定した開始位置から5桁を「金額」として抜き出し、その直後の1文字からQRコードのデータの末尾までをスキャン
 * 3. 判定: スキャンした全区間で「次の文字 = (現在の文字 + 1) % 10」の法則が、1文字の狂いもなくデータの最後まで成立するかを確認
 * 4. 確定: 法則が末尾まで完璧に成立した位置を「真の金額開始位置」と断定する
 * 
 * 馬番の把握:
 * - 確定した「金額開始位置」より手前（44桁目〜）のデータを2桁ずつ読み取る
 * - 01〜18の値: 選択された馬番号として取得
 * - 00の値: 空き枠として無視
 * 
 * @param code - QRコードの数字列（extra部分、43桁以降）
 * @returns ボックスの選択情報またはnull
 */
export const extractBoxSelection = (code: string): BoxSelection | null => {
  if (code.length < 15) return null;

  // 1. 式別の取得
  const betTypeCode = code.charAt(0);
  const betTypeMap: Record<string, BetType> = {
    '1': '単勝', '2': '複勝', '3': '枠連', '5': '馬連',
    '6': '馬単', '7': 'ワイド', '8': '3連複', '9': '3連単',
  };
  const betType = betTypeMap[betTypeCode];
  if (!betType) return null;

  // 2. パディングの開始位置を「後ろから」特定する (整合性チェック)
  // ルール: 次の文字 = (現在の文字 + 1) % 10 が崩れた場所を探す
  let paddingBoundary = code.length - 1;
  for (let i = code.length - 1; i > 0; i--) {
    const current = parseInt(code[i], 10);
    const prev = parseInt(code[i - 1], 10);
    if ((prev + 1) % 10 !== current) {
      paddingBoundary = i; // 連続性が崩れた位置（パディングの開始点）
      break;
    }
  }

  // 3. 金額位置の特定
  // ルール: パディング開始位置の直前5桁が金額
  const amountEndPos = paddingBoundary;
  const amountStartPos = amountEndPos - 5;
  
  if (amountStartPos < 1) return null; // 式別(0番目)より前には行かない

  const amountStr = code.substring(amountStartPos, amountEndPos);
  // 1点あたりの金額（例: "00001" は 100円）
  const unitInvestment = parseInt(amountStr, 10) * 100;

  // 4. 馬番の抽出 (44桁目/index 1 から 金額開始位置まで)
  const selections: number[] = [];
  for (let i = 1; i < amountStartPos; i += 2) {
    const horseStr = code.substring(i, i + 2);
    const horse = parseInt(horseStr, 10);
    if (!isNaN(horse) && horse > 0 && horse <= 18) {
      selections.push(horse);
    }
  }

  if (selections.length === 0) return null;

  // 5. 組数計算
  const getPatternCount = (type: BetType, n: number): number => {
    if (n < 2) return 0;
    switch (type) {
      case '馬単': return n * (n - 1);
      case '馬連':
      case 'ワイド':
      case '枠連': return (n * (n - 1)) / 2;
      case '3連単': return n * (n - 1) * (n - 2);
      case '3連複': return (n * (n - 1) * (n - 2)) / 6;
      default: return 1;
    }
  };

  const patternCount = getPatternCount(betType, selections.length);
  // 合計金額 = 1点あたりの金額 × 組数
  const totalInvestment = unitInvestment * patternCount;

  return {
    bet_type: betType,
    selections: selections,
    investment: totalInvestment,
  };
};
