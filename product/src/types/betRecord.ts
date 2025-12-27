/**
 * DB-001: データ構造定義
 * BetRecord型定義
 * 
 * JRA馬券の収支情報を管理するためのデータ構造
 */

/**
 * 馬券の式別（賭け方の種類）
 */
export type BetType = 
  | '単勝'
  | '複勝'
  | '枠連'
  | '馬単'
  | '馬連'
  | 'ワイド'
  | '3連単'
  | '3連複';

/**
 * JRA競馬場名
 */
export type Place = 
  | '東京'
  | '中山'
  | '京都'
  | '阪神'
  | '新潟'
  | '中京'
  | '小倉'
  | '福島'
  | '札幌'
  | '函館';

/**
 * 馬券の収支レコード
 * 
 * @property id - レコードの一意識別子（数値ID、自動採番）
 * @property date - 購入日（Date型）
 * @property place - 競馬場名（JRA10場のいずれか）
 * @property race_no - レース番号（1〜12）
 * @property bet_type - 式別（単勝、馬連、3連単等）
 * @property investment - 投資額（整数、単位：円）
 * @property return - 回収額（整数、単位：円）
 */
export interface BetRecord {
  /** レコードの一意識別子（数値ID、自動採番） */
  id: number;
  /** 購入日（Date型） */
  date: Date;
  /** 競馬場名（JRA10場のいずれか） */
  place: Place;
  /** レース番号（1〜12） */
  race_no: number;
  /** 式別（単勝、馬連、3連単等） */
  bet_type: BetType;
  /** 投資額（整数、単位：円） */
  investment: number;
  /** 回収額（整数、単位：円） */
  return: number;
}

/**
 * BetRecordの作成用データ（idを除く）
 * 新規レコード作成時に使用
 */
export type BetRecordInput = Omit<BetRecord, 'id'>;

