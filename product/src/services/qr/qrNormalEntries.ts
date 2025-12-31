/**
 * 通常・応援馬券の抽出ロジック
 */

import type { BetType } from '@/src/types/betRecord';
import type { NormalBetEntry } from './qrTypes';

/**
 * 通常・応援馬券の複数口を抽出する
 * 
 * 44桁以降のフォーマット（機番が9桁のため、44桁目から開始）:
 * 44:式別、45-46:一着、47-48:二着、49-50:三着、51-55:金額（一口目）
 * 56:式別、57-58:一着、59-60:二着、61-62:三着、63-67:金額（二口目）
 * ...
 * 
 * 終了条件: 式別が"0"の場合は終了
 * 
 * @param code - QRコードの数字列
 * @returns 各口の情報の配列
 */
export const extractNormalEntries = (code: string): NormalBetEntry[] => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/e67fc349-a245-4c88-ae2f-a1c721dd6e3d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'qrNormalEntries.ts:18',message:'extractNormalEntries entry',data:{codeLength:code.length,codePrefix:code.substring(0,60)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const entries: NormalBetEntry[] = [];
  
  if (code.length < 55) return entries;
  
  let pos = 42; // 43桁目から開始（0-indexedなので42）
  
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
  
  while (pos < code.length) {
    // 式別（1桁、43桁目）
    const betTypeCode = code.charAt(pos);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/e67fc349-a245-4c88-ae2f-a1c721dd6e3d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'qrNormalEntries.ts:36',message:'loop iteration',data:{pos,codeSegment:code.substring(pos,pos+15),betTypeCode,entryCount:entries.length},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    // 終了判定: Dartコードに基づき、式別が"0"の場合は終了
    if (betTypeCode === '0') {
      break;
    }
    
    const betType = betTypeMap[betTypeCode];
    
    if (!betType) {
      // 式別が無効な場合は終了
      break;
    }
    
    let firstPlaceNum: number | null = null;
    let secondPlaceNum: number | null = null;
    let thirdPlaceNum: number | null = null;
    let ura = false;
    let amountStartPos = pos + 1; // 金額の開始位置（式別の次から）
    
    // 一着の馬番（2桁）
    if (pos + 3 <= code.length) {
      const firstPlaceStr = code.substring(pos + 1, pos + 3);
      const firstPlace = parseInt(firstPlaceStr, 10);
      if (!isNaN(firstPlace) && firstPlace > 0 && firstPlace <= 18) {
        firstPlaceNum = firstPlace;
        amountStartPos = pos + 3; // 一着の後
      }
    }
    
    // 式別に応じた処理
    if (betType === '単勝' || betType === '複勝') {
      // 単勝・複勝: 一着のみ → 一着の後ろに00、その後ろに金額
      // 一着の後ろに00があることを確認（スキップ）
      amountStartPos = pos + 5; // 式別(1) + 一着(2) + 00(2) = 5桁
    } else if (betType === '馬単') {
      // 馬単: 一着、二着、裏の有無、金額
      if (pos + 5 <= code.length) {
        const secondPlaceStr = code.substring(pos + 3, pos + 5);
        const secondPlace = parseInt(secondPlaceStr, 10);
        if (!isNaN(secondPlace) && secondPlace > 0 && secondPlace <= 18) {
          secondPlaceNum = secondPlace;
        }
      }
      // 裏の有無（48-49桁相当）
      if (pos + 7 <= code.length) {
        const uraStr = code.substring(pos + 5, pos + 7);
        const uraValue = parseInt(uraStr, 10);
        ura = uraValue === 1;
      }
      amountStartPos = pos + 7; // 式別(1) + 一着(2) + 二着(2) + 裏(2) = 7桁
    } else if (betType === '枠連' || betType === '馬連' || betType === 'ワイド') {
      // 枠連・馬連・ワイド: 一着、二着、00（省略された三着の代わり）、金額
      if (pos + 5 <= code.length) {
        const secondPlaceStr = code.substring(pos + 3, pos + 5);
        const secondPlace = parseInt(secondPlaceStr, 10);
        if (!isNaN(secondPlace) && secondPlace > 0 && secondPlace <= 18) {
          secondPlaceNum = secondPlace;
        }
      }
      // 一着、二着の後に00があることを確認（スキップ）
      amountStartPos = pos + 7; // 式別(1) + 一着(2) + 二着(2) + 00(2) = 7桁
    } else if (betType === '3連複' || betType === '3連単') {
      // 3連複・3連単: 一着、二着、三着、金額
      if (pos + 5 <= code.length) {
        const secondPlaceStr = code.substring(pos + 3, pos + 5);
        const secondPlace = parseInt(secondPlaceStr, 10);
        if (!isNaN(secondPlace) && secondPlace > 0 && secondPlace <= 18) {
          secondPlaceNum = secondPlace;
        }
      }
      if (pos + 7 <= code.length) {
        const thirdPlaceStr = code.substring(pos + 5, pos + 7);
        const thirdPlace = parseInt(thirdPlaceStr, 10);
        if (!isNaN(thirdPlace) && thirdPlace > 0 && thirdPlace <= 18) {
          thirdPlaceNum = thirdPlace;
        }
      }
      amountStartPos = pos + 7; // 式別(1) + 一着(2) + 二着(2) + 三着(2) = 7桁
    }
    
    // 金額（5桁、単位100円）
    // Dartコードの実装に基づき、5桁の文字列の末尾に"00"を追加してから整数化
    // 例: "00001" → "0000100" → 100円、"00100" → "0010000" → 10,000円
    if (amountStartPos + 5 <= code.length) {
      const amountStr = code.substring(amountStartPos, amountStartPos + 5);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e67fc349-a245-4c88-ae2f-a1c721dd6e3d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'qrNormalEntries.ts:99',message:'amount extraction',data:{pos,amountStartPos,amountStr,betType,entryIndex:entries.length},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      // Dartコード: int.parse("${purchaseAmountStr}00") に基づく
      // 5桁の文字列の末尾に"00"を追加してから整数化
      const amountWithSuffix = amountStr + '00';
      let investment = parseInt(amountWithSuffix, 10);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e67fc349-a245-4c88-ae2f-a1c721dd6e3d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'qrNormalEntries.ts:105',message:'amount calculation',data:{amountStr,amountWithSuffix,investment,betType,ura},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // 馬単で裏ありの場合、投資額を2倍
      if (betType === '馬単' && ura) {
        investment = investment * 2;
      }
      
      entries.push({
        bet_type: betType,
        first_place: firstPlaceNum,
        second_place: secondPlaceNum,
        third_place: thirdPlaceNum,
        ura: ura,
        investment: investment,
      });
      
      // 次の口へ（式別ごとに可変長）
      pos = amountStartPos + 5; // 金額の後
    } else {
      // 金額が読み取れない場合は終了
      break;
    }
  }
  
  return entries;
};

