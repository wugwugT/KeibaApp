/**
 * DB-003: データ保存・削除
 * DB-004: データ取得
 * 
 * BetRecordのCRUD操作（作成、読み取り、更新、削除）
 */

import type { BetRecord, BetRecordInput, Place, BetType } from '@/src/types/betRecord';
import { getDatabase } from './init';

/**
 * Date型をUnixタイムスタンプ（ミリ秒）に変換する
 */
const dateToTimestamp = (date: Date): number => {
  return date.getTime();
};

/**
 * Unixタイムスタンプ（ミリ秒）をDate型に変換する
 */
const timestampToDate = (timestamp: number): Date => {
  return new Date(timestamp);
};

/**
 * 新しいBetRecordを保存する
 * 
 * @param input - 保存するデータ（idは自動生成）
 * @returns 保存されたBetRecord（idを含む）
 */
export const saveBetRecord = async (input: BetRecordInput): Promise<BetRecord> => {
  try {
    const db = getDatabase();
    
    const sql = `
      INSERT INTO bet_records (date, place, race_no, bet_type, investment, return)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const dateTimestamp = dateToTimestamp(input.date);

    const result = await db.runAsync(
      sql,
      dateTimestamp,
      input.place,
      input.race_no,
      input.bet_type,
      input.investment,
      input.return
    );

    const id = result.lastInsertRowId;
    
    const record: BetRecord = {
      id,
      ...input,
    };

    console.log('[DB] BetRecord saved:', id);
    return record;
  } catch (error) {
    console.error('[DB] Error saving BetRecord:', error);
    throw error;
  }
};

/**
 * 指定されたIDのBetRecordを削除する
 * 
 * @param id - 削除するレコードのID
 * @returns 削除された行数（1なら成功、0なら該当なし）
 */
export const deleteBetRecord = async (id: number): Promise<number> => {
  try {
    const db = getDatabase();
    
    const sql = `DELETE FROM bet_records WHERE id = ?`;
    const result = await db.runAsync(sql, id);

    console.log('[DB] BetRecord deleted:', id, 'changes:', result.changes);
    return result.changes;
  } catch (error) {
    console.error('[DB] Error deleting BetRecord:', error);
    throw error;
  }
};

/**
 * すべてのBetRecordを取得する
 * 
 * @returns 保存されているすべてのBetRecordの配列
 */
export const getAllBetRecords = async (): Promise<BetRecord[]> => {
  try {
    const db = getDatabase();
    
    const sql = `SELECT * FROM bet_records ORDER BY date DESC, race_no DESC`;
    const rows = await db.getAllAsync<{
      id: number;
      date: number;
      place: string;
      race_no: number;
      bet_type: string;
      investment: number;
      return: number;
    }>(sql);

    const records: BetRecord[] = rows.map(row => ({
      id: row.id,
      date: timestampToDate(row.date),
      place: row.place as Place,
      race_no: row.race_no,
      bet_type: row.bet_type as BetType,
      investment: row.investment,
      return: row.return,
    }));

    console.log('[DB] BetRecords retrieved:', records.length);
    return records;
  } catch (error) {
    console.error('[DB] Error getting BetRecords:', error);
    throw error;
  }
};

/**
 * 指定されたIDのBetRecordを取得する
 * 
 * @param id - 取得するレコードのID
 * @returns BetRecord（見つからない場合はnull）
 */
export const getBetRecordById = async (id: number): Promise<BetRecord | null> => {
  try {
    const db = getDatabase();
    
    const sql = `SELECT * FROM bet_records WHERE id = ?`;
    const row = await db.getFirstAsync<{
      id: number;
      date: number;
      place: string;
      race_no: number;
      bet_type: string;
      investment: number;
      return: number;
    }>(sql, id);

    if (!row) return null;

    const record: BetRecord = {
      id: row.id,
      date: timestampToDate(row.date),
      place: row.place as Place,
      race_no: row.race_no,
      bet_type: row.bet_type as BetType,
      investment: row.investment,
      return: row.return,
    };

    return record;
  } catch (error) {
    console.error('[DB] Error getting BetRecord by id:', error);
    throw error;
  }
};

/**
 * 指定された日付範囲のBetRecordを取得する
 * 
 * @param startDate - 開始日（含む）
 * @param endDate - 終了日（含む）
 * @returns 該当するBetRecordの配列
 */
export const getBetRecordsByDateRange = async (
  startDate: Date,
  endDate: Date
): Promise<BetRecord[]> => {
  try {
    const db = getDatabase();
    
    const startTimestamp = dateToTimestamp(startDate);
    const endTimestamp = dateToTimestamp(endDate);
    
    const sql = `
      SELECT * FROM bet_records 
      WHERE date >= ? AND date <= ?
      ORDER BY date DESC, race_no DESC
    `;
    const rows = await db.getAllAsync<{
      id: number;
      date: number;
      place: string;
      race_no: number;
      bet_type: string;
      investment: number;
      return: number;
    }>(sql, startTimestamp, endTimestamp);

    const records: BetRecord[] = rows.map(row => ({
      id: row.id,
      date: timestampToDate(row.date),
      place: row.place as Place,
      race_no: row.race_no,
      bet_type: row.bet_type as BetType,
      investment: row.investment,
      return: row.return,
    }));

    console.log('[DB] BetRecords retrieved by date range:', records.length);
    return records;
  } catch (error) {
    console.error('[DB] Error getting BetRecords by date range:', error);
    throw error;
  }
};

/**
 * 指定された競馬場のBetRecordを取得する
 * 
 * @param place - 競馬場名
 * @returns 該当するBetRecordの配列
 */
export const getBetRecordsByPlace = async (place: string): Promise<BetRecord[]> => {
  try {
    const db = getDatabase();
    
    const sql = `
      SELECT * FROM bet_records 
      WHERE place = ?
      ORDER BY date DESC, race_no DESC
    `;
    const rows = await db.getAllAsync<{
      id: number;
      date: number;
      place: string;
      race_no: number;
      bet_type: string;
      investment: number;
      return: number;
    }>(sql, place);

    const records: BetRecord[] = rows.map(row => ({
      id: row.id,
      date: timestampToDate(row.date),
      place: row.place as Place,
      race_no: row.race_no,
      bet_type: row.bet_type as BetType,
      investment: row.investment,
      return: row.return,
    }));

    console.log('[DB] BetRecords retrieved by place:', records.length);
    return records;
  } catch (error) {
    console.error('[DB] Error getting BetRecords by place:', error);
    throw error;
  }
};
