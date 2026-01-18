/**
 * 通常・応援馬券の抽出ロジック
 * ルールに基づいて、前後関係から値を把握する
 */

import type { BetType } from '@/src/types/betRecord';
import type { NormalBetEntry } from './qrTypes';

/**
 * 通常・応援馬券の複数口を抽出する
 * 
 * ルール:
 * - 43桁: 式別（1単勝、2複勝、3枠連、5馬連、6馬単、7ワイド、8三連複、9三連単）
 * - 次2桁: 一着の馬番
 * - 次2桁: 二着の馬番（該当なしの場合は00）
 * - 次2桁: 三着の馬番（該当なしの場合は00）
 * - 次5桁: 金額（単位100円、例：00001なら100円）
 * 
 * 単勝・複勝の場合:
 * - 一着の馬番の後、00で埋められる（2着、3着の枠）
 * - 金額がすべて00000の場合、3着目の枠も存在したため、先ほどの00を2着、次の00を3着として扱う
 * 
 * 馬単の場合:
 * - 三着の枠に00=裏なし、01=裏ありが入る
 * 
 * 終了条件:
 * - 通常券: 金額算出後、次の3桁が000の場合、省略（終了）
 * - 応援馬券: 一口目と二口目のみ（000などの終了値がない）
 * 
 * @param code - QRコードの数字列（extra部分、43桁以降）
 * @param buyMethod - 買い方（0=通常、5=応援馬券）
 * @returns 各口の情報の配列
 */
export const extractNormalEntries = (code: string, buyMethod: number): NormalBetEntry[] => {
  const entries: NormalBetEntry[] = [];
  
  if (code.length < 12) return entries; // 最低限の長さチェック（式別1桁+一着2桁+二着2桁+三着2桁+金額5桁）
  
  let pos = 0; // extraの先頭（43桁目相当）から開始
  
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
  
  let entryCount = 0;
  const maxEntries = buyMethod === 5 ? 2 : Infinity; // 応援馬券は2口まで
  
  while (pos < code.length && entryCount < maxEntries) {
    // 式別（1桁）
    if (pos >= code.length) break;
    const betTypeCode = code.charAt(pos);
    
    // 終了判定: 式別が"0"の場合は終了（通常券のみ）
    if (betTypeCode === '0' && buyMethod === 0) {
      break;
    }
    
    const betType = betTypeMap[betTypeCode];
    if (!betType) {
      break;
    }
    
    pos++; // 式別の次へ
    
    let firstPlace: number | null = null;
    let secondPlace: number | null = null;
    let thirdPlace: number | null = null;
    let ura = false;
    
    // 一着の馬番（2桁）
    if (pos + 2 <= code.length) {
      const firstPlaceStr = code.substring(pos, pos + 2);
      const firstPlaceNum = parseInt(firstPlaceStr, 10);
      if (!isNaN(firstPlaceNum) && firstPlaceNum > 0 && firstPlaceNum <= 18) {
        firstPlace = firstPlaceNum;
      }
      pos += 2;
    } else {
      break;
    }
    
    // 式別に応じた処理
    if (betType === '単勝' || betType === '複勝') {
      // まず共通して存在する「2着枠(00)」の2桁分だけ進める
      pos += (buyMethod === 5) ? 2 : 4;
    } else if (betType === '馬単') {
      // 馬単: 一着、二着、裏の有無（00=裏なし、01=裏あり）
      if (pos + 2 <= code.length) {
        const secondPlaceStr = code.substring(pos, pos + 2);
        const secondPlaceNum = parseInt(secondPlaceStr, 10);
        if (!isNaN(secondPlaceNum) && secondPlaceNum > 0 && secondPlaceNum <= 18) {
          secondPlace = secondPlaceNum;
        }
        pos += 2;
      }
      
      // 裏の有無（2桁）
      if (pos + 2 <= code.length) {
        const uraStr = code.substring(pos, pos + 2);
        const uraValue = parseInt(uraStr, 10);
        ura = uraValue === 1;
        pos += 2;
      }
    } else if (betType === '枠連' || betType === '馬連' || betType === 'ワイド') {
      // 枠連・馬連・ワイド: 一着、二着、00（三着の枠）
      if (pos + 2 <= code.length) {
        const secondPlaceStr = code.substring(pos, pos + 2);
        const secondPlaceNum = parseInt(secondPlaceStr, 10);
        if (!isNaN(secondPlaceNum) && secondPlaceNum > 0 && secondPlaceNum <= 18) {
          secondPlace = secondPlaceNum;
        }
        pos += 2;
      }
      
      // // 三着の枠（00で埋められる）
      // if (pos + 2 <= code.length && code.substring(pos, pos + 2) === '00') {
      //   pos += 2;
      // }
    } else if (betType === '3連複' || betType === '3連単') {
      // 3連複・3連単: 一着、二着、三着
      if (pos + 2 <= code.length) {
        const secondPlaceStr = code.substring(pos, pos + 2);
        const secondPlaceNum = parseInt(secondPlaceStr, 10);
        if (!isNaN(secondPlaceNum) && secondPlaceNum > 0 && secondPlaceNum <= 18) {
          secondPlace = secondPlaceNum;
        }
        pos += 2;
      }
      
      if (pos + 2 <= code.length) {
        const thirdPlaceStr = code.substring(pos, pos + 2);
        const thirdPlaceNum = parseInt(thirdPlaceStr, 10);
        if (!isNaN(thirdPlaceNum) && thirdPlaceNum > 0 && thirdPlaceNum <= 18) {
          thirdPlace = thirdPlaceNum;
        }
        pos += 2;
      }
    }
    
    // 金額（5桁、単位100円）
    // 通常券(0)かつ単勝・複勝で金額が00000の場合のみ、3着目の枠(00)が存在したとみなす
    if (buyMethod === 0 && (betType === '単勝' || betType === '複勝') && pos + 5 <= code.length) {
      const amountStr = code.substring(pos, pos + 5);
      if (amountStr === '00000') {
        // 先ほどの00を2着の馬番枠、次の00を3着の馬番枠として扱う
        // 金額の位置を再調整
        pos += 2; // 2着の枠をスキップ
        if (pos + 2 <= code.length && code.substring(pos, pos + 2) === '00') {
          pos += 2; // 3着の枠をスキップ
        }
        // 再度金額を読み取る
        if (pos + 5 <= code.length) {
          const newAmountStr = code.substring(pos, pos + 5);
          let investment: number;
          const amountPrefix = newAmountStr.substring(0, 3);
          if (amountPrefix === '000') {
            investment = parseInt(newAmountStr, 10) * 100;
          } else {
            investment = parseInt(amountPrefix, 10) * 100;
          }
          
          entries.push({
            bet_type: betType,
            first_place: firstPlace,
            second_place: secondPlace,
            third_place: thirdPlace,
            ura: ura,
            investment: investment,
          });
          
          pos += 5;
          entryCount++;

          // 応援馬券(5)の場合は、000チェックをせずに次の口（複勝）の処理へ
          if ((buyMethod as number) === 5) continue;
          
          // 終了判定（通常券のみ）: 次の3桁が000の場合、省略
          if (buyMethod === 0 && pos + 3 <= code.length) {
            if (code.substring(pos, pos + 3) === '000') {
              break; 
            }
          }
          continue;
        }
      }
    }
    
    // 通常の金額読み取り
    // ルール: 50-54桁が金額（単位100円、例：00001なら100円）
    // 金額フィールドの解釈方法:
    // - 最初の3桁が "000" の場合: 金額フィールド全体を整数として解釈し、100倍
    //   例: "00001" → 1 * 100 = 100円
    //   例: "00004" → 4 * 100 = 400円
    // - それ以外の場合: 最初の3桁を整数として解釈し、100倍
    //   例: "01000" → 10 * 100 = 1000円
    //   例: "04030" → 40 * 100 = 4000円
    if (pos + 5 <= code.length) {
      const amountStr = code.substring(pos, pos + 5);
      
      // 金額を計算
      // let investment: number;
      // const amountPrefix = amountStr.substring(0, 3);
      // if (amountPrefix === '000') {
      //   // 最初の3桁が "000" の場合、全体を整数として解釈し、100倍
      //   investment = parseInt(amountStr, 10) * 100;
      // } else {
      //   // それ以外の場合、最初の3桁を整数として解釈し、100倍
      //   investment = parseInt(amountPrefix, 10) * 100;
      // }
      // 金額を計算（常に5桁すべてを数値化して100倍する）
      let investment: number;
      const amountPrefix = amountStr.substring(0, 3);
      if (amountPrefix === '000') {
        investment = parseInt(amountStr, 10) * 100;
      } else {
        investment = parseInt(amountPrefix, 10) * 100;
      }
      
      // 馬単で裏ありの場合、投資額を2倍
      if (betType === '馬単' && ura) {
        investment = investment * 2;
      }
      
      entries.push({
        bet_type: betType,
        first_place: firstPlace,
        second_place: secondPlace,
        third_place: thirdPlace,
        ura: ura,
        investment: investment,
      });
      
      pos += 5; // 金額の次へ
      entryCount++;

      // 応援馬券(5)の場合は、000チェックをせずに次の口（複勝）の処理へ
      if ((buyMethod as number) === 5) continue;
      
      // 終了判定（通常券のみ）
      if (buyMethod === 0 && pos + 3 <= code.length) {
        if (code.substring(pos, pos + 3) === '000') {
          break;
        }
      }
    } else {
      break;
    }
  }
  
  return entries;
};
