/**
 * DB-003: データ保存・削除
 * DB-004: データ取得
 * 
 * BetRecordのCRUD操作（作成、読み取り、更新、削除）
 */

import type { BetRecord, BetRecordInput } from '@/src/types/betRecord';
import { getDatabase } from './init';

/**
 * UUIDを生成する（簡易版）
 * 本番環境では適切なUUIDライブラリを使用することを推奨
 */
const generateUUID = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
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
    const id = generateUUID();
    
    const record: BetRecord = {
      id,
      ...input,
    };

    const sql = `
      INSERT INTO bet_records (id, date, place, race_no, bet_type, investment, return)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await db.runAsync(
      sql,
      record.id,
      record.date,
      record.place,
      record.race_no,
      record.bet_type,
      record.investment,
      record.return
    );

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
export const deleteBetRecord = async (id: string): Promise<number> => {
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
    const records = await db.getAllAsync<BetRecord>(sql);

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
export const getBetRecordById = async (id: string): Promise<BetRecord | null> => {
  try {
    const db = getDatabase();
    
    const sql = `SELECT * FROM bet_records WHERE id = ?`;
    const record = await db.getFirstAsync<BetRecord>(sql, id);

    return record || null;
  } catch (error) {
    console.error('[DB] Error getting BetRecord by id:', error);
    throw error;
  }
};

/**
 * 指定された日付範囲のBetRecordを取得する
 * 
 * @param startDate - 開始日（YYYY-MM-DD形式、含む）
 * @param endDate - 終了日（YYYY-MM-DD形式、含む）
 * @returns 該当するBetRecordの配列
 */
export const getBetRecordsByDateRange = async (
  startDate: string,
  endDate: string
): Promise<BetRecord[]> => {
  try {
    const db = getDatabase();
    
    const sql = `
      SELECT * FROM bet_records 
      WHERE date >= ? AND date <= ?
      ORDER BY date DESC, race_no DESC
    `;
    const records = await db.getAllAsync<BetRecord>(sql, startDate, endDate);

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
    const records = await db.getAllAsync<BetRecord>(sql, place);

    console.log('[DB] BetRecords retrieved by place:', records.length);
    return records;
  } catch (error) {
    console.error('[DB] Error getting BetRecords by place:', error);
    throw error;
  }
};

