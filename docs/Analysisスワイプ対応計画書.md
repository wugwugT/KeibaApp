# Analysis画面 タブスワイプ対応 計画書

## 0. エグゼクティブサマリー

Analysis画面の5つのタブ（競馬場/式別/R番/日別/累積）は現在タップのみで切替可能。
左右スワイプでタブを切り替えられるようにし、直感的なUXを実現する。

既にインストール済みの `react-native-gesture-handler` (v2.28) + `react-native-reanimated` (v4.1) を使い、
**新規依存パッケージの追加は不要**。

---

## 1. 現状

- タブ切替はセグメントボタンのタップのみ
- Analysis画面は `FlatList` による縦スクロールを3パターン持つ（trend / cumulative / place・betType・raceNo）
- スワイプ操作に対応していないため、片手操作時にタブ切替が不便

---

## 2. 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `product/src/screens/Analysis.tsx` | スワイプジェスチャー追加（唯一の変更対象） |

---

## 3. 実装詳細

### 3-1. import追加

```typescript
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
```

### 3-2. タブ順序の定義

```typescript
const MODES: Mode[] = ['place', 'betType', 'raceNo', 'trend', 'cumulative'];
```

- 順序はセグメントUIの並び順と一致させる
- `MODES.indexOf(mode)` で現在のインデックスを取得し、前後に移動する

### 3-3. スワイプジェスチャー作成

```typescript
const swipeGesture = Gesture.Pan()
  .activeOffsetX([-20, 20])    // 水平20px以上の移動で発火
  .failOffsetY([-10, 10])      // 縦10px以上動いたらキャンセル（FlatListスクロール優先）
  .onEnd((event) => {
    if (event.translationX < -50) {
      // 左スワイプ → 次のタブへ
      runOnJS(goToNextTab)();
    } else if (event.translationX > 50) {
      // 右スワイプ → 前のタブへ
      runOnJS(goToPrevTab)();
    }
  });
```

**閾値の設計理由**:

| パラメータ | 値 | 理由 |
|-----------|-----|------|
| `activeOffsetX` | `[-20, 20]` | 意図しない微小な横移動を無視 |
| `failOffsetY` | `[-10, 10]` | 縦スクロール操作がジェスチャーに割り込まないよう早期キャンセル |
| `translationX` 閾値 | `±50px` | 軽いタッチを誤検出しない最低移動距離 |

### 3-4. タブ切替関数

```typescript
const goToNextTab = () => {
  const currentIndex = MODES.indexOf(mode);
  if (currentIndex < MODES.length - 1) {
    setMode(MODES[currentIndex + 1]);
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }
};

const goToPrevTab = () => {
  const currentIndex = MODES.indexOf(mode);
  if (currentIndex > 0) {
    setMode(MODES[currentIndex - 1]);
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }
};
```

- 端のタブ（競馬場 / 累積）でそれ以上スワイプしても何も起きない
- Hapticフィードバックは `haptic-tab.tsx` の既存パターンに準拠（iOS限定）

### 3-5. GestureDetectorでラップ

Analysis画面は `mode` に応じて3つの `return` ブロックを持つ:

1. `mode === 'trend'` → 日別トレンドFlatList（L267-354）
2. `mode === 'cumulative'` → 累積収支FlatList（L357-433）
3. デフォルト（place / betType / raceNo）→ 汎用FlatList（L436-511）

**各FlatListを `<GestureDetector gesture={swipeGesture}>` でラップする。**

```
変更前:                          変更後:
return (                        return (
  <FlatList ... />                <GestureDetector gesture={swipeGesture}>
);                                  <FlatList ... />
                                  </GestureDetector>
                                );
```

**注意**: `GestureDetector` は直下に単一のネイティブViewを要求するため、
`FlatList` を直接子にする。もし動作しない場合は `<View style={{ flex: 1 }}>` でラップする。

---

## 4. FlatList縦スクロールとの競合回避

```
ユーザーの指の動き:
  ↕ 縦方向 → failOffsetY: [-10, 10] でジェスチャーが即座にfail → FlatListが正常スクロール
  ↔ 横方向 → activeOffsetX: [-20, 20] でジェスチャーがactivate → タブ切替
  ↗ 斜め   → 縦成分が先に10pxを超えるとfail → FlatListスクロール優先
```

この方式は `Gesture.Pan()` の排他ロジックに依存しており、
FlatList自体の `scrollEnabled` を制御する必要はない。

---

## 5. 検証チェックリスト

| # | 検証項目 | 期待動作 |
|---|---------|---------|
| 1 | 左スワイプ | 現在のタブ → 右隣のタブに切替 |
| 2 | 右スワイプ | 現在のタブ → 左隣のタブに切替 |
| 3 | 端タブでのスワイプ | 競馬場で右スワイプ / 累積で左スワイプ → 何も起きない |
| 4 | FlatList縦スクロール | 上下スクロールが従来通り正常動作 |
| 5 | タブタップ切替 | セグメントボタンのタップが引き続き動作 |
| 6 | 斜めスワイプ | 縦成分が大きい場合はスクロール優先 |
| 7 | Hapticフィードバック | タブ切替時にiOSで軽い振動 |
| 8 | カード展開 | 各カードのタップ展開/折りたたみが正常動作 |

---

## 6. リスク

| リスク | 影響 | 対策 |
|-------|------|------|
| GestureDetector + FlatListの競合 | 縦スクロールが効かなくなる | `failOffsetY` の値を調整 / `View`ラップ |
| Androidでの動作差異 | ジェスチャー閾値が異なる場合 | Android実機テストで閾値微調整 |
| `reanimated` v4のAPI差異 | `runOnJS` の動作 | v4ではそのまま動作確認済み |
