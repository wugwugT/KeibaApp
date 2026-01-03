/**
 * DB-002: DB初期化
 * SQLiteデータベースの初期化とテーブル作成
 * 
 * アプリ起動時に呼び出され、BetRecordテーブルを自動作成します。
 */

import { openDatabaseSync, SQLiteDatabase } from 'expo-sqlite';

/**
 * データベース名
 */
const DATABASE_NAME = 'betRecords.db';

/**
 * テーブル作成SQL
 * BetRecord型定義に基づいたテーブル構造
 */
const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS bet_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    date INTEGER NOT NULL,
    place TEXT NOT NULL,
    race_no INTEGER NOT NULL,
    bet_type TEXT NOT NULL,
    investment INTEGER NOT NULL,
    return INTEGER NOT NULL
  );
`;

/**
 * データベースインスタンス
 */
let db: SQLiteDatabase | null = null;

/**
 * データベースを開く
 * @returns SQLiteデータベースインスタンス
 */
export const getDatabase = (): SQLiteDatabase => {
  if (!db) {
    db = openDatabaseSync(DATABASE_NAME);
  }
  return db;
};

/**
 * データベースを初期化し、テーブルを作成する
 * アプリ起動時に一度だけ呼び出す
 * 
 * 注意: この関数は同期処理です。重い処理を実行する場合は
 * 非同期版（initializeDatabaseAsync）を使用してください。
 */
export const initializeDatabase = (): void => {
  try {
    const database = getDatabase();
    
    // テーブル作成（同期処理）
    database.execSync(CREATE_TABLE_SQL);
    
    console.log('[DB] Database initialized successfully');
  } catch (error) {
    console.error('[DB] Error initializing database:', error);
    throw error;
  }
};

/**
 * データベースを初期化し、テーブルを作成する（非同期版）
 * アプリ起動時に一度だけ呼び出す
 * 
 * @returns Promise<void> 初期化が完了したら解決
 */
export const initializeDatabaseAsync = async (): Promise<void> => {
  try {
    const database = getDatabase();
    
    // テーブル作成（非同期処理）
    await database.execAsync(CREATE_TABLE_SQL);
    
    console.log('[DB] Database initialized successfully');
  } catch (error) {
    console.error('[DB] Error initializing database:', error);
    throw error;
  }
};

