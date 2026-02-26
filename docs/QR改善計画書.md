# QR読み取り改善 & 地方競馬対応 計画書

## 0. エグゼクティブサマリー

現在のMAKENアプリのQR読み取りには**根本的な構造問題**がある。
JRA馬券は1枚に**2つのQRコード**（左・右、各95桁 = 計190桁）を持ち、
複雑な買い方（フォーメーション・ながし・複数券種）は**必ず2つ目のQRに跨る**。
現在のアプリは**片方のQRしか読めない**ため、これらの馬券が根本的にパースできない。

また、地方競馬のQRフォーマットはJRAと**base部分の長さが異なる**（JRA: 42桁、地方: 50桁）
ことが実馬券で判明しており、単純な場コード追加では対応できない。

---

## 1. 現状の問題点

### 1-1. 致命的：2つのQRコードの結合に未対応

JRA馬券の構造:
```
┌─────────────────────────────────┐
│  馬券 (1枚)                      │
│                                   │
│  [QR左] 95桁    [QR右] 95桁      │
│  ├─ base: 42桁  ├─ extra続き     │
│  └─ extra: 53桁 └─ padding       │
│                                   │
│  結合すると: base(42) + extra(最大148桁) │
│  ※右QR末尾5桁はチェックデジット        │
└─────────────────────────────────┘
```

- 左QRのextra領域は **53桁しかない**
- フォーメーションのextraは最低 **61桁** 必要（式別1 + 固定0 1 + ビットマップ54 + 金額5）
- ながしのextraは最低 **62桁** 必要（式別2 + ビットマップ54 + 金額5 + マルチ1）
- → **フォーメーション・ながしは構造的に片方のQRだけでは情報が足りない**
- **実データ検証済み**: サンプル2（中山 三連複フォーメーション 700円）で2QR結合パースが正しく動作することを確認

### 1-2. 致命的：複数券種の馬券でデータ消失

通常馬券で2口以上ある場合（例：単勝 + 複勝を1枚で購入）:
- QRパーサーは複数エントリを正しく抽出する
- しかし**DBには1行しか保存されない**（`bet_type`と`investment`が1つずつしかない）
- → 2口目以降のデータが**完全に消失**する

### 1-3. 重大：フォーメーションの長さチェックバグ

`qrFormation.ts:23` で `if (code.length < 103)` としているが、
`code`はextra部分（43桁目以降）なので、必要な長さは **61** が正しい。
103は不正な値で、たとえ2QR結合しても動作しない可能性がある。

### 1-4. 致命的：地方競馬のQRフォーマットが根本的に異なる

**実データ検証結果（サンプル1: 船橋 単勝 3000円）:**
- `Place`型がJRA10場のみ（`'東京' | '中山' | ...`）
- 場コードマップにJRAの01-10しかない
- **地方競馬はbase部分が50桁**（JRAは42桁）— base=42で解析すると式別・金額が全て不正解
- base=50で解析すると: 式別=`1`(単勝)、金額=`03000`(3000円) と**正しくパース**できる
- 場コード `57` = 船橋（地方競馬のQRコード独自の番号体系）
- → `separateBaseAndExtra`でJRA/地方を判別してbase長を切り替えるロジックが必須

### 1-5. 重大：右QR末尾のチェックデジット未考慮

**実データ検証結果:**
- 右QRの末尾5桁はチェックデジット（サンプル1: `60689`、サンプル2: `60523`）
- パディングパターンが途切れた位置にあり、パディング除去時に考慮が必要
- 現行のパディング検出ロジックでは、チェックデジットがパディングの一部と誤認される可能性

### 1-6. 中程度：ながしのパターン数計算が不正確

三連単軸2頭で`patternCount = opponents.length`としているが、
軸の配置パターン（軸-軸-相手 vs 相手-軸-軸 等）によって組み合わせ数が異なる。
マルチ時の`× 6`も常に正しいわけではない。

### 1-7. 軽微：セッションを跨いだ重複チェックなし

`scannedTicketNosRef`はメモリ上のSetで、アプリ再起動で消える。
同じ馬券を別セッションで再スキャンしても検知できない。

---

## 2. 改善項目一覧（優先度順）

| # | 改善項目 | 優先度 | 影響範囲 | 依存 | 検証状況 |
|---|---------|--------|---------|------|---------|
| A | 2QR結合スキャン | P0(最優先) | Scanner, useQR, qrScanner | - | サンプル2で検証済み |
| B | DB/型の拡張（複数口対応 + 地方競馬） | P0 | 全レイヤー | - | - |
| C | 地方競馬対応（base=50判別 + 場コード） | P0 | qrExtractors, qrScanner, types | B | サンプル1で検証済み |
| D | フォーメーション長さチェック修正 | P1 | qrFormation | A | サンプル2で検証済み |
| E | 複数口のDB保存修正 | P1 | RecordEdit, crud | A, B | - |
| F | ながしパターン数の正確な計算 | P2 | qrNagashi | A | 実データ未入手 |
| G | DB永続重複チェック | P3 | useQR, crud | B | - |

---

## 3. 各改善項目の詳細実装

### A. 2QR結合スキャン（P0）

**目的**: 1枚の馬券の2つのQRコードを結合して190桁のデータとしてパースする

**現状の問題**:
- `Scanner.tsx`のカメラは1つのQRを検出すると即座に`recordEdit`に遷移する
- 右QRは数字列だがパディングだらけのため`isValidQRData`で弾かれ無視される
- → 複雑な馬券は「読み取り失敗」としてユーザーに何も表示されない

**実装方針**:

```
[スキャンフロー]

1. 左QR検出 → base(42桁) + extra_left(53桁) を抽出
2. まず左QRだけでパース試行
   ├─ 成功（通常の単純な馬券）→ そのまま遷移
   └─ 失敗 or 不完全 → 「右QRもスキャンしてください」表示
3. 右QR検出 → extra_right(95桁) を取得
4. 結合: base(42桁) + extra_left(53桁) + extra_right(95桁) = 190桁
5. パディング除去 → パース → 遷移
```

**変更ファイル & 変更内容**:

#### A-1. `Scanner.tsx` — 2段階スキャン UI

```typescript
// 新しい状態管理
type ScanPhase = 'scanning_first' | 'need_second' | 'complete';

const [scanPhase, setScanPhase] = useState<ScanPhase>('scanning_first');
const [firstQRData, setFirstQRData] = useState<string | null>(null);

// onBarcodeScanned ハンドラの改修
onBarcodeScanned={({ data }) => {
  if (scanPhase === 'scanning_first') {
    // 左QRの処理
    const parsed = extractJRAItemsFromQR(data);
    if (isValidQRData(parsed)) {
      // 単純な馬券 → そのまま遷移
      router.push({ pathname: '/recordEdit', params: { qr: JSON.stringify(parsed) } });
    } else if (isPartialQRData(data)) {
      // base情報は取れるがextraが不完全 → 2枚目待ち
      setFirstQRData(data);
      setScanPhase('need_second');
    }
  } else if (scanPhase === 'need_second') {
    // 右QRの処理
    const combined = combineQRData(firstQRData!, data);
    const parsed = extractJRAItemsFromQR(combined);
    if (isValidQRData(parsed)) {
      router.push({ pathname: '/recordEdit', params: { qr: JSON.stringify(parsed) } });
    }
  }
}}

// UI: 2枚目スキャン待ちの表示
{scanPhase === 'need_second' && (
  <View style={styles.secondQROverlay}>
    <Text>右側のQRコードをスキャンしてください</Text>
  </View>
)}
```

#### A-2. `qrScanner.ts` — 結合ロジック & 部分判定

```typescript
/**
 * 2つのQRコードデータを結合する
 * 左QR（95桁）+ 右QR（95桁）→ base + extra
 *
 * 実データ検証結果:
 * - 右QR末尾5桁はチェックデジット（例: 60523, 60689）
 * - パディング除去後、末尾5桁も除去する必要がある
 * - baseの長さはJRA=42, 地方=50で自動判別
 */
const RIGHT_QR_CHECK_DIGIT_LENGTH = 5;

export const combineQRData = (leftQR: string, rightQR: string): string => {
  // 右QRからチェックデジット(末尾5桁)を除去
  const rightWithoutCheck = rightQR.substring(0, rightQR.length - RIGHT_QR_CHECK_DIGIT_LENGTH);
  // 右QRの有効データ部分（パディング除去）
  const paddingStart = detectPaddingStart(rightWithoutCheck, 0);
  const rightExtra = paddingStart >= 0
    ? rightWithoutCheck.substring(0, paddingStart)
    : rightWithoutCheck;
  // 左QR全体 + 右QRの有効データ部分
  return leftQR + rightExtra;
};

/**
 * 左QRだけでは不完全だが、base情報は有効かを判定
 * → 2枚目スキャンが必要かの判断に使う
 */
export const isPartialQRData = (qrData: string): boolean => {
  if (!/^\d+$/.test(qrData) || qrData.length < 42) return false;
  const { base } = separateBaseAndExtra(qrData);
  const place = extractPlaceFrom95DigitCode(base);
  const raceNo = extractRaceNoFrom95DigitCode(base);
  const buyMethod = extractBuyMethodFrom95DigitCode(base);
  // base情報は有効だが、extraが不完全な場合
  return place !== null && raceNo !== null && buyMethod !== null;
};
```

#### A-3. `useQR.ts` — 2段階スキャン対応

```typescript
// 状態に scanPhase を追加
// firstQRData のref管理
// handleQRScanned を phase-aware に
```

---

### B. DB/型の拡張（P0）

**目的**: 複数口対応 & 地方競馬の場名に対応するためにDB・型を拡張

**現状の問題**:
- `Place`型がJRA10場のハードコード
- `BetRecord`が1レコード = 1式別 = 1投資額で、複数口を表現できない
- 地方競馬場（15場）を追加すると型が膨大になる

**実装方針**:

#### B-1. `Place`型の拡張 — `betRecord.ts`

```typescript
/** JRA競馬場名 */
export type JRAPlace =
  | '東京' | '中山' | '京都' | '阪神'
  | '新潟' | '中京' | '小倉' | '福島'
  | '札幌' | '函館';

/** 地方競馬場名 */
export type LocalPlace =
  | '帯広' | '門別'           // 北海道
  | '盛岡' | '水沢'           // 東北
  | '浦和' | '船橋' | '大井' | '川崎' // 南関東
  | '金沢' | '笠松' | '名古屋'       // 東海・北陸
  | '園田' | '姫路'           // 近畿
  | '高知'                    // 四国
  | '佐賀';                   // 九州

/** 全競馬場名 */
export type Place = JRAPlace | LocalPlace;
```

#### B-2. DBスキーマ変更 — `init.ts`

```
現行:  place TEXT NOT NULL  ← JRA10場の文字列
変更後: place TEXT NOT NULL  ← 地方含む全場の文字列（型は変わらないが値の幅が拡大）
```

→ SQLiteの`place`カラムは`TEXT`型なので、スキーマ変更は不要。
→ TypeScript側の`Place`型を拡張するだけでDB互換性は保たれる。

#### B-3. 複数口への対応方針

**方針: 1口 = 1レコード として分割保存**

理由:
- DBスキーマの変更が最小限
- 既存の分析ロジック（集計hooks）がそのまま動く
- 「単勝500円 + 複勝300円」の馬券は2レコードとして保存

```
QRスキャン → normal_entries[2] → RecordEditで確認
                                  → 保存時に2レコード作成
  { date, place, race_no, bet_type: '単勝', investment: 500, return: 0 }
  { date, place, race_no, bet_type: '複勝', investment: 300, return: 0 }
```

変更箇所:
- `RecordEdit.tsx`: 複数口の場合、各口ごとに保存ボタンを押すか一括保存
- `crud.ts`: `saveBetRecords(inputs: BetRecordInput[])` を追加（バルク保存）

---

### C. 地方競馬対応（P1） — 実データ検証済みの大幅改訂

**実データから判明した事実:**
- 地方競馬のQRはbase部分が**50桁**（JRAは42桁）
- extra部分のフォーマット（式別→馬番→金額）は**JRAと同一**
- 場コード `57` = 船橋 が実馬券で確認済み
- base=50で解析: 式別=`1`(単勝)、金額=`03000`(3000円) → **正確に一致**

**変更ファイル**: `qrExtractors.ts`, `qrScanner.ts`

#### C-1. JRA/地方判別 & base長切り替え — `qrExtractors.ts`

```typescript
/**
 * QRコードがJRAか地方競馬かを判別する
 *
 * 判別ロジック:
 * - 場コード(2-3桁目)が01-10 → JRA (base=42)
 * - 場コード(2-3桁目)が11以上 → 地方 (base=50)
 */
export const detectRacingType = (code: string): 'jra' | 'local' => {
  if (code.length < 3) return 'jra'; // フォールバック
  const placeCode = parseInt(code.substring(1, 3), 10);
  return placeCode >= 1 && placeCode <= 10 ? 'jra' : 'local';
};

export const getBaseLength = (code: string): number => {
  return detectRacingType(code) === 'jra' ? 42 : 50;
};
```

#### C-2. separateBaseAndExtra の改修

```typescript
export const separateBaseAndExtra = (qrData: string): { base: string; extra: string } => {
  const baseLen = getBaseLength(qrData);
  if (qrData.length < baseLen) {
    return { base: qrData, extra: '' };
  }
  const base = qrData.substring(0, baseLen);
  const extraWithPadding = qrData.substring(baseLen);
  // パディング除去（既存ロジック）
  const paddingStart = detectPaddingStart(extraWithPadding, 0);
  if (paddingStart >= 0) {
    return { base, extra: extraWithPadding.substring(0, paddingStart) };
  }
  return { base, extra: extraWithPadding };
};
```

#### C-3. 地方競馬の場コード追加

```typescript
const placeCodeMap: Record<string, Place> = {
  // JRA（中央競馬）— 実データ検証済み
  '01': '札幌', '02': '函館', '03': '福島', '04': '新潟', '05': '東京',
  '06': '中山', '07': '中京', '08': '京都', '09': '阪神', '10': '小倉',
  // 地方競馬（NAR）— 実データ検証: 57=船橋 確認済み、他は要検証
  '57': '船橋',    // ✅ 実馬券で確認済み
  // 以下はWeb調査ベース（実馬券での検証が入り次第更新）
  // '61': '大井',   // Web調査
  // '62': '川崎',   // Web調査
  // 他の地方競馬場は実データ入手後に追加
};
```

**レース番号上限の緩和:**

```typescript
// 現行: raceNo >= 1 && raceNo <= 12
// 地方競馬は12Rを超える開催もある
if (!isNaN(raceNo) && raceNo >= 1 && raceNo <= 16) {  // 16Rまで拡張
  return raceNo;
}
```

**注意事項:**
- 地方の場コードはWeb調査の番号（31=浦和等）とQR実データの番号（57=船橋）が**異なる体系**
- 実馬券が手に入り次第 `docs/QRテストデータ.md` に追記 → 場コードマップを更新する運用
- ばんえい競馬（帯広）は初期対応から除外

---

### D. フォーメーション長さチェック修正（P1）

**変更ファイル**: `qrFormation.ts`

```typescript
// 修正前（バグ）
if (code.length < 103) return null;

// 修正後
// extra部分に必要な最低長: 式別1 + 固定0 1 + ビットマップ(18×3) + 金額5 = 61
if (code.length < 61) return null;
```

**注意**: この修正だけでは不十分。フォーメーションのextraは61桁必要だが、
左QRのextraは最大53桁しかないため、**改善Aの2QR結合が前提**。

---

### E. 複数口のDB保存修正（P1）

**変更ファイル**: `RecordEdit.tsx`, `crud.ts`

#### E-1. `crud.ts` — バルク保存関数の追加

```typescript
/**
 * 複数のBetRecordを一括保存する（トランザクション使用）
 */
export const saveBetRecords = async (inputs: BetRecordInput[]): Promise<BetRecord[]> => {
  const db = getDatabase();
  const records: BetRecord[] = [];

  await db.withTransactionAsync(async () => {
    for (const input of inputs) {
      const result = await db.runAsync(
        `INSERT INTO bet_records (date, place, race_no, bet_type, investment, return) VALUES (?, ?, ?, ?, ?, ?)`,
        dateToTimestamp(input.date), input.place, input.race_no,
        input.bet_type, input.investment, input.return
      );
      records.push({ id: result.lastInsertRowId, ...input });
    }
  });

  return records;
};
```

#### E-2. `RecordEdit.tsx` — 一括保存フローの改修

```typescript
// QRデータに複数エントリがある場合の保存処理
const handleSave = async () => {
  // normal_entriesが2口以上の場合
  if (qrData?.normal_entries && qrData.normal_entries.length > 1) {
    const inputs: BetRecordInput[] = qrData.normal_entries.map(entry => ({
      date,
      place: place as Place,
      race_no: Number(raceNo),
      bet_type: entry.bet_type,
      investment: entry.investment,
      return: 0,
    }));
    await saveBetRecords(inputs);
    Alert.alert('登録完了', `${inputs.length}口の馬券を保存しました`);
    navigation.goBack();
    return;
  }
  // 単一エントリの場合は従来通り
  // ...
};
```

**UI変更**:
- 複数口の場合、各口の回収額を個別入力できるようにする
- または、一括で回収額0として保存 → 後から個別に編集
- 画面上には「3口の馬券として保存します」等の案内を表示

---

### F. ながしパターン数の正確な計算（P2）

**変更ファイル**: `qrNagashi.ts`

現行の簡易計算を正確な組み合わせ計算に修正:

```typescript
// 三連単 軸2頭の場合
if (betType === '3連単' && axis2.length > 0) {
  // パターン: 各相手馬 × 1（軸の位置は固定）
  patternCount = opponents.length;
  if (isMulti) {
    // マルチ: 軸2頭+相手1頭の3頭の全順列 = 3! / (固定分)
    // 実際には軸-軸-相手 の場合、マルチで 軸-相手-軸, 相手-軸-軸 等の
    // 3P3 / 重複 = 3パターン（軸2頭が区別されるため）
    patternCount = opponents.length * 3; // ※要実馬券検証
  }
}

// 三連単 軸1頭の場合
if (betType === '3連単' && axis2.length === 0) {
  // 軸以外の相手から2頭の順列
  patternCount = opponents.length * (opponents.length - 1);
  if (isMulti) {
    // マルチ: 軸1頭 + 相手2頭の全順列 = 3通り
    patternCount = opponents.length * (opponents.length - 1) * 3;
  }
}
```

**注意**: マルチの倍率は式別と軸の数で変わる:
- 馬単マルチ: ×2
- 三連単 軸2頭マルチ: ×3
- 三連単 軸1頭マルチ: ×3
- 三連複はマルチ概念なし

**この修正は実馬券での検証が必須**。計算式が正しいか、実際の投資額と照合すること。

---

### G. DB永続重複チェック（P3）

**変更ファイル**: `init.ts`, `crud.ts`, `useQR.ts`

#### G-1. `init.ts` — ticket_noカラム追加

```sql
-- マイグレーションSQL（ALTER TABLE）
ALTER TABLE bet_records ADD COLUMN ticket_no TEXT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_ticket_no ON bet_records(ticket_no);
```

#### G-2. `crud.ts` — 重複チェック関数

```typescript
export const isTicketNoDuplicate = async (ticketNo: string): Promise<boolean> => {
  const db = getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM bet_records WHERE ticket_no = ?',
    ticketNo
  );
  return (row?.count ?? 0) > 0;
};
```

#### G-3. `useQR.ts` — DB重複チェックの統合

```typescript
// 既存のSetチェック + DBチェック
const ticketNo = extractTicketNoFrom95DigitCode(data);
if (ticketNo) {
  if (scannedTicketNosRef.current.has(ticketNo)) return; // セッション内重複
  const dbDuplicate = await isTicketNoDuplicate(ticketNo);
  if (dbDuplicate) {
    // 「この馬券は既に登録済みです」と通知
    return;
  }
}
```

---

## 4. 実装順序と依存関係

```
Phase 1: 基盤整備（DB・型の拡張 + 地方対応の型）
  ├─ B-1: Place型の拡張 — JRA + 地方競馬場 (betRecord.ts)
  ├─ B-2: DBマイグレーション確認 (init.ts) ← スキーマ変更不要
  └─ B-3: バルク保存関数追加 (crud.ts)

Phase 2: QRパーサー基盤（地方対応 + 2QR結合）
  ├─ C-1: JRA/地方判別 + base長切り替え (qrExtractors.ts) ← 実データ検証済み
  ├─ C-2: separateBaseAndExtra 改修 (qrExtractors.ts)
  ├─ C-3: 地方場コード追加 (qrExtractors.ts)
  ├─ A-2: combineQRData + チェックデジット除去 (qrScanner.ts) ← 実データ検証済み
  └─ D: フォーメーション長さチェック修正 (qrFormation.ts) ← 実データ検証済み

Phase 3: スキャナーUI
  ├─ A-1: 2段階スキャンUI (Scanner.tsx)
  └─ A-3: useQR の phase対応 (useQR.ts)

Phase 4: UI & 保存フロー
  └─ E: RecordEdit複数口対応 (RecordEdit.tsx)

Phase 5: 品質向上（任意）
  ├─ F: ながしパターン数修正 (qrNagashi.ts) ← 実データ入手後
  └─ G: DB永続重複チェック (init.ts, crud.ts, useQR.ts)
```

---

## 5. テスト計画

### 必要な実馬券サンプル

| テストケース | 馬券の種類 | 検証項目 |
|-------------|-----------|---------|
| 単純な単勝/複勝 | 通常・1口 | 既存機能の回帰テスト |
| 単勝+複勝の1枚券 | 通常・2口 | 複数口パース → 2レコード保存 |
| 3連単ボックス(5頭) | ボックス | パターン数(60) × 金額 の正確性 |
| 3連単フォーメーション | フォーメーション | 2QR結合 → ビットマップパース |
| 馬単ながし(マルチ) | ながし | 2QR結合 → マルチ倍率の正確性 |
| 地方・大井の馬券 | 地方競馬 | 場コード(33) → '大井' 変換 |
| 地方・川崎の馬券 | 地方競馬 | 場コード(34) → '川崎' 変換 |
| 応援馬券 | 通常(method=5) | 2口固定の正常パース |

### テスト手法

1. **ユニットテスト**: QRパーサーの各関数に対してテストデータで検証
   - 実馬券のQR文字列を元にテストフィクスチャを作成
   - `combineQRData`のパディング除去テスト
   - 各式別のパターン数計算テスト

2. **統合テスト**: Scanner → RecordEdit → DB保存の一連のフローを検証

3. **実機テスト**: 実際の馬券でスキャン → 金額が実際の購入金額と一致するか検証

---

## 6. リスクと未解決事項

### 高リスク
- **地方競馬のQR仕様が未公開**: Web調査の情報に依存。実馬券での検証が必須
- **JRAと地方の場コード衝突**: QR1桁目で判別可能な可能性があるが、要検証
- **ばんえい競馬**: 馬券フォーマットが異なる可能性大。初期リリースでは除外推奨

### 中リスク
- **2QR結合のUX**: ユーザーに「右のQRもスキャンして」と促す体験は少し面倒
  → 将来的にはカメラで2つ同時読み取りや、画像からの2QR検出も検討
- **既存データとの互換性**: Place型を拡張しても既存DBデータは影響なし（TEXT型のため）

### 低リスク
- **地方競馬のレース番号**: 12Rを超える可能性 → 16Rまで拡張で対応
- **金額計算の精度**: ながしのマルチ倍率は要検証だが、最悪ユーザーが手動修正可能

---

## 7. 変更ファイル一覧

| ファイル | Phase | 変更内容 |
|---------|-------|---------|
| `src/types/betRecord.ts` | 1 | Place型に地方競馬場を追加 |
| `src/services/db/crud.ts` | 1 | saveBetRecords (バルク保存) 追加 |
| `src/services/qr/qrScanner.ts` | 2 | combineQRData, isPartialQRData 追加 |
| `src/screens/Scanner.tsx` | 2 | 2段階スキャンUI |
| `src/hooks/useQR.ts` | 2 | scanPhase管理 |
| `src/services/qr/qrExtractors.ts` | 3 | 地方場コード追加、レースNo上限緩和 |
| `src/services/qr/qrFormation.ts` | 3 | 長さチェック修正 (103→61) |
| `src/services/qr/qrNagashi.ts` | 3 | パターン数計算の正確化 |
| `src/screens/RecordEdit.tsx` | 4 | 複数口の一括保存フロー |
| `src/services/db/init.ts` | 5 | ticket_noカラム追加 (マイグレーション) |

---

## 8. 参考情報

- [JRA馬券QRコード解析 (yoshi223)](http://ys223.blogspot.com/2019/07/jra.html)
- [馬券QRコードの中身を読む](https://ryo-kida.blog.jp/archives/55769096.html)
- [馬券のQRコードって何が書いてあるの？](https://tobatoba70.hateblo.jp/entry/2022/05/01/221547)
- [JRA馬券QRコード読み取りアプリ](https://strangerxxx.hateblo.jp/entry/20250617/1750132067)
- [電話投票会場識別コード (Weblio)](https://www.weblio.jp/content/%E5%90%84%E7%AB%B6%E6%8A%80%E3%81%AE%E9%9B%BB%E8%A9%B1%E6%8A%95%E7%A5%A8%E4%BC%9A%E5%A0%B4%E8%AD%98%E5%88%A5%E3%82%B3%E3%83%BC%E3%83%89)
