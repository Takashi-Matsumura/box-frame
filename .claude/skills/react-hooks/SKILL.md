---
name: React Hooks ベストプラクティス
description: useCallback、useEffect の正しい使い方、無限ループ防止。Biomeチェック後の修正、Client Component作成時に使用。
---

# React Hooks ベストプラクティス

## 問題: Biomeチェック後の無限ループ

Biomeの `useExhaustiveDependencies` ルールで関数を依存配列に追加すると、`useCallback` でメモ化されていない場合**無限ループが発生**します。

### ❌ 無限ループが発生するパターン

```typescript
const fetchData = async () => {
  const response = await fetch("/api/data");
  setData(await response.json());
};

useEffect(() => {
  fetchData();
}, [fetchData]); // ← 無限ループ！
```

**原因**: `fetchData` が毎回新しい関数として作成され、useEffectが「依存配列の値が変わった」と判断して再実行されます。

### ✅ 正しい修正方法

```typescript
import { useCallback, useEffect, useState } from "react";

// 1. useCallback で関数をメモ化（useEffect の前に定義）
const fetchData = useCallback(async () => {
  const response = await fetch("/api/data");
  setData(await response.json());
}, []); // 依存配列が空 = 関数の参照が変わらない

// 2. useEffect で呼び出し
useEffect(() => {
  fetchData();
}, [fetchData]); // 安全
```

## useCallback の依存配列の決め方

### パターン1: 外部変数に依存しない場合

```typescript
const fetchData = useCallback(async () => {
  const response = await fetch("/api/data");
  setData(await response.json());
}, []); // 依存配列は空
```

### パターン2: propsやstateに依存する場合

```typescript
const fetchData = useCallback(async () => {
  const response = await fetch(`/api/data?id=${userId}`);
  setData(await response.json());
}, [userId]); // userIdが変わったら関数を再作成
```

### パターン3: 翻訳オブジェクトに依存する場合

```typescript
const fetchData = useCallback(async () => {
  try {
    const response = await fetch("/api/data");
    setData(await response.json());
  } catch (error) {
    alert(t.loadError); // 翻訳オブジェクトを使用
  }
}, [t.loadError]); // 該当キーを依存配列に追加
```

## 実装の手順

1. **useCallback をインポート**
   ```typescript
   import { useCallback, useEffect, useState } from "react";
   ```

2. **fetch関数を定義（useEffect の前）**
   ```typescript
   const fetchData = useCallback(async () => {
     // fetch処理
   }, [依存する変数]);
   ```

3. **useEffect で呼び出し**
   ```typescript
   useEffect(() => {
     fetchData();
   }, [fetchData]);
   ```

## よくある間違い

### ❌ useEffect の後に関数を定義

```typescript
useEffect(() => {
  fetchData();
}, [fetchData]);

const fetchData = useCallback(...); // エラー！
```

### ❌ 不要な変数を依存配列に含める

```typescript
const fetchData = useCallback(async () => {
  setData(await response.json());
}, [data, setData]); // ← data と setData は不要
```

`setData` はReactが保証する安定した参照なので不要。

## チェックリスト

- [ ] `useCallback` をインポートしているか
- [ ] useEffectで使用する関数は `useCallback` でラップされているか
- [ ] 関数定義は useEffect の**前**に配置されているか
- [ ] 依存配列に適切な変数のみが含まれているか
- [ ] 不要な変数（setState関数など）が依存配列に含まれていないか
