/**
 * QRコードから基本情報を抽出する関数群
 */

import type { BetType, Place } from '@/src/types/betRecord';

/**
 * 95桁の数字列から競馬場名を抽出する
 * 
 * 2-3桁：競馬場コード
 * 01札幌、02函館、03福島、04新潟、05東京、06中山、07中京、08京都、09阪神、10小倉
 * 
 * @param code - 95桁の数字列
 * @returns 競馬場名またはnull
 */
export const extractPlaceFrom95DigitCode = (code: string): Place | null => {
  if (code.length < 3) return null;
  
  // 2-3桁目を取得（0-indexedなので1-2）
  const placeCode = code.substring(1, 3);
  
  const placeCodeMap: Record<string, Place> = {
    '01': '札幌',
    '02': '函館',
    '03': '福島',
    '04': '新潟',
    '05': '東京',
    '06': '中山',
    '07': '中京',
    '08': '京都',
    '09': '阪神',
    '10': '小倉',
  };
  
  return placeCodeMap[placeCode] || null;
};

/**
 * 95桁の数字列からレース番号を抽出する
 * 
 * 13-14桁：レース番号
 * 
 * @param code - 95桁の数字列
 * @returns レース番号（1〜12）またはnull
 */
export const extractRaceNoFrom95DigitCode = (code: string): number | null => {
  if (code.length < 14) return null;
  
  // 13-14桁目を取得（0-indexedなので12-13）
  const raceNoStr = code.substring(12, 14);
  const raceNo = parseInt(raceNoStr, 10);
  
  if (!isNaN(raceNo) && raceNo >= 1 && raceNo <= 12) {
    return raceNo;
  }
  
  return null;
};

/**
 * 95桁の数字列から式別を抽出する
 * 
 * 43桁：式別
 * 1単勝、2複勝、3枠連、5馬連、6馬単、7ワイド、8三連複、9三連単
 * 
 * @param code - 95桁の数字列
 * @returns 式別またはnull
 */
export const extractBetTypeFrom95DigitCode = (code: string): BetType | null => {
  if (code.length < 43) return null;
  
  // 43桁目を取得（0-indexedなので42）
  const betTypeCode = code.charAt(42);
  
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
  
  return betTypeMap[betTypeCode] || null;
};

/**
 * 95桁の数字列から年を抽出する
 * 
 * 7-8桁：年（12なら12年 = 2012年）
 * 
 * @param code - 95桁の数字列
 * @returns 年（2桁、例: 12）またはnull
 */
export const extractYearFrom95DigitCode = (code: string): number | null => {
  if (code.length < 8) return null;
  
  // 7-8桁：年（0-indexedなので6-7）
  const yearStr = code.substring(6, 8);
  const year = parseInt(yearStr, 10);
  
  if (!isNaN(year) && year >= 0 && year <= 99) {
    return year;
  }
  
  return null;
};

/**
 * 95桁の数字列から回を抽出する
 * 
 * 9-10桁：回（05なら5回）
 * 
 * @param code - 95桁の数字列
 * @returns 回（例: 5）またはnull
 */
export const extractRoundFrom95DigitCode = (code: string): number | null => {
  if (code.length < 10) return null;
  
  // 9-10桁：回（0-indexedなので8-9）
  const roundStr = code.substring(8, 10);
  const round = parseInt(roundStr, 10);
  
  if (!isNaN(round) && round >= 1 && round <= 12) {
    return round;
  }
  
  return null;
};

/**
 * 95桁の数字列から日を抽出する
 * 
 * 11-12桁：日（08なら8日）
 * 
 * @param code - 95桁の数字列
 * @returns 日（例: 8）またはnull
 */
export const extractDayFrom95DigitCode = (code: string): number | null => {
  if (code.length < 12) return null;
  
  // 11-12桁：日（0-indexedなので10-11）
  const dayStr = code.substring(10, 12);
  const day = parseInt(dayStr, 10);
  
  if (!isNaN(day) && day >= 1 && day <= 31) {
    return day;
  }
  
  return null;
};

/**
 * 95桁の数字列から買い方を抽出する
 * 
 * 15桁：買い方
 * 0通常、1ボックス、2ながし、3フォーメーション、5応援馬券
 * 
 * @param code - 95桁の数字列
 * @returns 買い方（0, 1, 2, 3, 5）またはnull
 */
export const extractBuyMethodFrom95DigitCode = (code: string): number | null => {
  if (code.length < 15) return null;
  
  // 15桁目を取得（0-indexedなので14）
  const buyMethodCode = code.charAt(14);
  const buyMethod = parseInt(buyMethodCode, 10);
  
  // 有効な買い方コードかチェック（0, 1, 2, 3, 5）
  if (!isNaN(buyMethod) && [0, 1, 2, 3, 5].includes(buyMethod)) {
    return buyMethod;
  }
  
  return null;
};

/**
 * 95桁の数字列から馬券番号を抽出する
 * 
 * 17-42桁：馬券番号（重複チェック用）
 * 
 * @param code - 95桁の数字列
 * @returns 馬券番号（17-22桁の文字列）またはnull
 */
export const extractTicketNoFrom95DigitCode = (code: string): string | null => {
  if (code.length < 22) return null;
  
  // 17-22桁目を取得（0-indexedなので16-21）: 発券通番
  const ticketNo = code.substring(16, 22);
  
  return ticketNo || null;
};

/**
 * 95桁の数字列から発売場所を抽出・変換する
 * * 29-32桁：発売場所
 * * @param code - 95桁の数字列
 * @returns 発売場所名（変換できない場合はコード、またはnull）
 */
export const extractSalesLocationFrom95DigitCode = (code: string): string | null => {
  if (code.length < 32) return null;

  // 29-32桁目を取得（0-indexedなので28-31）
  const locationCode = code.substring(28, 32);

  const salesLocationMap: Record<string, string> = {
    '0101': 'JRA札幌',
    '0202': 'JRA函館',
    '0303': 'JRA福島',
    '0404': 'JRA新潟',
    '0505': 'JRA東京',
    '0606': 'JRA中山',
    '0707': 'JRA中京',
    '0808': 'JRA京都',
    '0909': 'JRA阪神',
    '1010': 'JRA小倉',
    '3030': 'ウインズ札幌',
    '3039': 'ウインズ釧路',
    '3071': 'ウインズ津軽',
    '3068': 'ウインズ盛岡',
    '3064': 'ウインズ水沢',
    '3286': 'ウインズ三本木',
    '3019': 'ウインズ新白河',
    '3213': 'ウインズ銀座',
    '3232': 'ウインズ後楽園',
    '2222': 'ウインズ錦糸町',
    '2218': 'ウインズ浅草',
    '3434': 'ウインズ汐留',
    '4200': 'ウインズ新宿',
    '3216': 'ウインズ渋谷',
    '3441': 'ウインズ立川',
    '3284': 'ウインズ川崎',
    '3220': 'ウインズ横浜',
    '2100': 'ウインズ新横浜',
    '3421': 'ウインズ新横浜',
    '2287': 'ライトウインズ阿見',
    '3285': 'ウインズ浦和',
    '3240': 'ウインズ石和',
    '3470': 'エクセル田無',
    '3262': 'エクセル伊勢佐木',
    '2426': 'ウインズ名古屋',
    '2427': 'ウインズ京都',
    '2424': 'ウインズ難波',
    '2929': 'ウインズ道頓堀',
    '2423': 'ウインズ梅田',
    '2944': 'ウインズ神戸',
    '2974': 'ウインズ姫路',
    '3483': 'エクセル浜松',
    '2989': 'ライトウインズりんくうタウン',
    '3828': 'ウインズ米子',
    '3838': 'ウインズ広島',
    '2877': 'ウインズ小郡',
    '3846': 'ウインズ高松',
    '3833': 'ウインズ佐世保',
    '2482': 'ウインズ八代',
    '2881': 'ウインズ宮崎',
    '3800': 'エクセル博多',
    '2867': 'ウインズ佐賀',
    '3481': '宮崎育成牧場',
  };

  // マップにあれば名称を、なければ元のコードを返す
  return salesLocationMap[locationCode] || locationCode;
};

/**
 * 95桁の数字列から発売機の機番コードを抽出する
 * 
 * 35-43桁：発売機の機番コード（9桁）
 * 先頭2桁は30固定（ただし、ウインズなどでは異なる可能性がある）
 * 例: 302420（阪神競馬場 201号投票所 20号機）、302910（WINS梅田B館5階 27号機）
 * 
 * 参考: https://ys223.blogspot.com/2019/07/jra.html?m=1
 * 
 * @param code - 95桁の数字列
 * @returns 発売機の機番コード（35-43桁の文字列、9桁）またはnull
 */
export const extractMachineCodeFrom95DigitCode = (code: string): string | null => {
  if (code.length < 43) return null;
  
  // 35-43桁目を取得（0-indexedなので34-42）
  const machineCode = code.substring(34, 43);
  
  // 機番コードは9桁の数字列（先頭が30でなくても有効な可能性がある）
  if (/^\d{9}$/.test(machineCode)) {
    return machineCode;
  }
  
  return null;
};

