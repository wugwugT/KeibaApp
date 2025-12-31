/**
 * QRコード関連の型定義と定数
 */

import type { BetType, Place } from '@/src/types/betRecord';

/**
 * 通常・応援馬券の各口の情報
 */
export interface NormalBetEntry {
  /** 式別 */
  bet_type: BetType;
  /** 一着の馬番（00の場合は該当なし） */
  first_place: number | null;
  /** 二着の馬番（00の場合は該当なし） */
  second_place: number | null;
  /** 三着の馬番（00の場合は該当なし） */
  third_place: number | null;
  /** 裏の有無（馬単のみ、00=裏なし、01=裏あり） */
  ura: boolean;
  /** 投資額（円、単位100円） */
  investment: number;
}

/**
 * フォーメーションの選択情報
 */
export interface FormationSelection {
  /** 1着目の選択馬番（1-18） */
  first_place_selections: number[];
  /** 2着目の選択馬番（1-18） */
  second_place_selections: number[];
  /** 3着目の選択馬番（1-18） */
  third_place_selections: number[];
  /** 投資額（円、単位100円） */
  investment: number;
}

/**
 * ながしの選択情報
 */
export interface NagashiSelection {
  /** 軸1頭目の選択馬番（1-18） */
  axis1_selections: number[];
  /** 軸2頭目の選択馬番（1-18、軸2頭ながしの場合のみ） */
  axis2_selections: number[];
  /** 相手の選択馬番（1-18） */
  opponent_selections: number[];
  /** 投資額（円、単位100円） */
  investment: number;
  /** マルチフラグ（true=マルチ） */
  is_multi: boolean;
}

/**
 * ボックスの選択情報
 */
export interface BoxSelection {
  /** 選択した馬番のリスト（1-18） */
  selections: number[];
  /** 投資額（円、単位100円） */
  investment: number;
}

/**
 * QRコードから抽出されたJRA項目
 */
export interface JRAQRData {
  /** 競馬場名（2-3桁） */
  place: Place | null;
  /** レース番号（13-14桁） */
  race_no: number | null;
  /** 年（7-8桁）: 12なら2012年 */
  year: number | null;
  /** 回（9-10桁）: 05なら5回 */
  round: number | null;
  /** 日（11-12桁）: 08なら8日 */
  day: number | null;
  /** 買い方（15桁）: 0通常、1ボックス、2ながし、3フォーメーション、4クイックピック、5応援馬券 */
  buy_method: number | null;
  /** 発券通番（17-22桁）: 重複チェック用 */
  ticket_no: string | null;
  /** 発売場所（29-32桁）: 競馬場コードまたはウインズコード */
  sales_location: string | null;
  /** 発売機の機番コード（35-43桁）: 9桁のコード */
  machine_code: string | null;
  
  /** 通常・応援馬券の場合: 各口の情報 */
  normal_entries: NormalBetEntry[] | null;
  /** フォーメーションの場合: 選択情報 */
  formation_selection: FormationSelection | null;
  /** ながしの場合: 選択情報 */
  nagashi_selection: NagashiSelection | null;
  /** ボックスの場合: 選択情報 */
  box_selection: BoxSelection | null;
  
  /** 投資額の合計（円） */
  total_investment: number | null;
  
  /** 互換性のため: 一口目の式別（後方互換性） */
  bet_type: BetType | null;
  /** 互換性のため: 一口目の一着馬番（後方互換性） */
  horse_no: number | null;
  /** 互換性のため: 一口目の投資額（後方互換性） */
  investment: number | null;
  
  /** その他の生データ */
  rawData: string;
}

/**
 * QRコードのバーコードタイプ
 * Expo Camera SDK 54では'qr'を使用
 */
export const QR_CODE_TYPES: readonly ['qr'] = ['qr'] as const;

