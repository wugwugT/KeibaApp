/**
 * QRコードから基本情報を抽出する関数群
 * base（JRA: 1-42桁、地方: 1-50桁）の情報を抽出
 */

import type { BetType, Place } from '@/src/types/betRecord';

/**
 * QRコードがJRAか地方競馬かを判別する
 * 場コード(2-3桁目)が01-10 → JRA (base=42)、11以上 → 地方 (base=50)
 */
export const detectRacingType = (code: string): 'jra' | 'local' => {
  if (code.length < 3) return 'jra';
  const placeCode = parseInt(code.substring(1, 3), 10);
  return placeCode >= 1 && placeCode <= 10 ? 'jra' : 'local';
};

export const getBaseLength = (code: string): number => {
  return detectRacingType(code) === 'jra' ? 42 : 50;
};

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
    // JRA (01-10)
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
    // 地方 (実馬券で検証済みのもの)
    '57': '船橋',
    // 以下は未検証（実馬券検証待ち）
    // '36': '帯広',
    // '30': '門別',
    // '35': '盛岡',
    // '34': '水沢',
    // '42': '浦和',
    // '43': '大井',
    // '44': '川崎',
    // '46': '金沢',
    // '47': '笠松',
    // '48': '名古屋',
    // '50': '園田',
    // '51': '姫路',
    // '54': '高知',
    // '55': '佐賀',
  };
  
  return placeCodeMap[placeCode] || null;
};

/**
 * 95桁の数字列からレース番号を抽出する
 * 
 * 13-14桁：レース番号
 * 
 * @param code - 95桁の数字列
 * @returns レース番号（1〜16）またはnull
 */
export const extractRaceNoFrom95DigitCode = (code: string): number | null => {
  if (code.length < 14) return null;

  // 13-14桁目を取得（0-indexedなので12-13）
  const raceNoStr = code.substring(12, 14);
  const raceNo = parseInt(raceNoStr, 10);

  if (!isNaN(raceNo) && raceNo >= 1 && raceNo <= 16) {
    return raceNo;
  }

  return null;
};

/**
 * 95桁の数字列から式別を抽出する（通常券・応援馬券用）
 * 
 * 43桁：式別
 * 1単勝、2複勝、3枠連、5馬連、6馬単、7ワイド、8三連複、9三連単
 * 
 * @param code - QRコードの数字列
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
 * 0通常、1ボックス、2ながし、3フォーメーション、4クイックピック、5応援馬券
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
 * 17-22桁：発券通番（重複チェック用）
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
 * 29-32桁：発売場所
 * 
 * @param code - 95桁の数字列
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
 * パディングパターンを検出し、有効データの終端位置を返す
 * 
 * パディングは「0123456789」の周期パターンで、開始位置から末尾まで
 * 連続性が保たれているかをチェックする。
 * 
 * @param data - チェックするデータ文字列
 * @param startPos - チェック開始位置（0-indexed）
 * @returns パディング開始位置（見つからない場合は-1）
 */
export const detectPaddingStart = (data: string, startPos: number): number => {
  if (startPos >= data.length) return -1;
  
  // パディングパターンが開始される可能性のある位置を順にチェック
  // ルール: 0123456789の周期パターンが開始された時点で、その後のすべてのデータをパディング領域として扱う
  // パディングは「次の文字 = (現在の文字 + 1) % 10」の法則が成立する
  
  // パディングパターンの最小長を定義（1周期 = 10文字）
  const MIN_PADDING_LENGTH = 10;
  
  // パディングは通常 '01234567890...' または '1234567890...' から始まる
  // '0123456789...' から始まる場合を優先的にチェック（より早い位置を検出するため）
  for (let checkPos = startPos; checkPos < data.length - MIN_PADDING_LENGTH + 1; checkPos++) {
    if (data.charAt(checkPos) === '0') {
      // '0123456789...' のパターンをチェック
      let isValid = true;
      let expectedNext = 0;
      let consecutiveCount = 1;
      
      for (let i = checkPos + 1; i < data.length; i++) {
        const current = parseInt(data.charAt(i), 10);
        const expected = (expectedNext + 1) % 10;
        
        if (current === expected) {
          consecutiveCount++;
          expectedNext = expected;
        } else {
          isValid = false;
          break;
        }
      }
      
      if (isValid && consecutiveCount >= MIN_PADDING_LENGTH) {
        return checkPos;
      }
    }
  }
  
  // '0123456789...' が見つからない場合、'1234567890...' をチェック
  for (let checkPos = startPos; checkPos < data.length - MIN_PADDING_LENGTH + 1; checkPos++) {
    if (data.charAt(checkPos) === '1') {
      let isValid = true;
      let expectedNext = 1;
      let consecutiveCount = 1;
      
      for (let i = checkPos + 1; i < data.length; i++) {
        const current = parseInt(data.charAt(i), 10);
        const expected = (expectedNext + 1) % 10;
        
        if (current === expected) {
          consecutiveCount++;
          expectedNext = expected;
        } else {
          isValid = false;
          break;
        }
      }
      
      if (isValid && consecutiveCount >= MIN_PADDING_LENGTH) {
        return checkPos;
      }
    }
  }
  
  // '1234567890...' が見つからない場合、'9012345678...' をチェック
  for (let checkPos = startPos; checkPos < data.length - MIN_PADDING_LENGTH + 1; checkPos++) {
    if (data.charAt(checkPos) === '9') {
      let isValid = true;
      let expectedNext = 9;
      let consecutiveCount = 1;
      
      for (let i = checkPos + 1; i < data.length; i++) {
        const current = parseInt(data.charAt(i), 10);
        const expected = (expectedNext + 1) % 10;
        
        if (current === expected) {
          consecutiveCount++;
          expectedNext = expected;
        } else {
          isValid = false;
          break;
        }
      }
      
      if (isValid && consecutiveCount >= MIN_PADDING_LENGTH) {
        return checkPos;
      }
    }
  }
  
  return -1;
};

/**
 * base（JRA: 1-42桁、地方: 1-50桁）とextra（base以降）を分離し、パディングを除去する
 *
 * @param qrData - QRコードから読み取った文字列データ
 * @returns baseとextra（パディング除去済み）のオブジェクト
 */
export const separateBaseAndExtra = (qrData: string): { base: string; extra: string } => {
  const baseLen = getBaseLength(qrData);

  if (qrData.length < baseLen) {
    return { base: qrData, extra: '' };
  }

  const base = qrData.substring(0, baseLen);
  const extraWithPadding = qrData.substring(baseLen);

  // パディング開始位置を検出
  const paddingStart = detectPaddingStart(extraWithPadding, 0);

  if (paddingStart >= 0) {
    // パディングが見つかった場合、その手前までをextraとする
    const extra = extraWithPadding.substring(0, paddingStart);
    return { base, extra };
  }

  // パディングが見つからない場合、そのまま返す
  return { base, extra: extraWithPadding };
};
