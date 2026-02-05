---
name: UI/UXデザインガイドライン
description: 共通UIコンポーネント、カラーパレット、タイポグラフィ、スペーシング、空状態デザイン。UI実装、コンポーネント作成、スタイリング時に使用。
---

# UI/UXデザインガイドライン

## テーマ・カラーシステム

### ダークモード対応

このアプリはライト/ダークモード対応。**ハードコード色は使用禁止**。

```tsx
// ❌ 禁止: ハードコード色
<div className="bg-white text-gray-800 border-gray-300">

// ✅ 推奨: セマンティックカラー
<div className="bg-card text-foreground border-input">
```

### セマンティックカラー対応表

| 用途 | セマンティック | 旧ハードコード |
|------|---------------|----------------|
| カード背景 | `bg-card` | `bg-white` |
| ページ背景 | `bg-background` | `bg-gray-50` |
| ミュート背景 | `bg-muted` | `bg-gray-50`, `bg-gray-100` |
| 主要テキスト | `text-foreground` | `text-gray-800`, `text-gray-900` |
| 副次テキスト | `text-muted-foreground` | `text-gray-500`, `text-gray-600` |
| ボーダー | `border` | `border-gray-200` |
| 入力ボーダー | `border-input` | `border-gray-300` |

### カラー背景にはdark:バリアントを追加

```tsx
// カラー背景は dark: バリアントを追加
<div className="bg-blue-50 dark:bg-blue-950">
<div className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
```

## shadcn/ui コンポーネント

### 必須インポート

```tsx
// ボタン
import { Button } from "@/components/ui/button";

// カード
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

// テーブル
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// バッジ
import { Badge } from "@/components/ui/badge";

// ダイアログ（モーダル）
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// スイッチ
import { Switch } from "@/components/ui/switch";

// 入力
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
```

### ボタンバリアント

```tsx
<Button variant="default">主要アクション</Button>
<Button variant="secondary">副次アクション</Button>
<Button variant="destructive">削除</Button>
<Button variant="outline">アウトライン</Button>
<Button variant="ghost">ゴースト</Button>
```

## レイアウトパターン

### ページコンテナ

```tsx
// 標準ページ
<div className="max-w-7xl mx-auto">
  <Card>
    <CardContent className="p-6">
      {/* コンテンツ */}
    </CardContent>
  </Card>
</div>

// タブ付きページ（ヘッダーにタブがある場合）
<div className="max-w-7xl mx-auto mt-8">
  {/* mt-8でタブとの間隔を確保 */}
</div>
```

### テーブルレイアウト

```tsx
<Card>
  <CardContent className="p-6">
    {/* ヘッダー：タイトル + アクション */}
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <Icon className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">タイトル</h2>
      </div>
      <Button>
        <Plus className="w-4 h-4 mr-2" />
        新規作成
      </Button>
    </div>

    {/* 検索・フィルター */}
    <div className="flex items-center gap-4 mb-4">
      <Input placeholder="検索..." className="max-w-sm" />
      <Select>...</Select>
    </div>

    {/* 合計表示 */}
    <div className="text-sm text-muted-foreground mb-4">
      合計: {total}
    </div>

    {/* テーブル */}
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>カラム</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>{item.value}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>

    {/* ページネーション */}
    <div className="flex items-center justify-end gap-2 mt-4">
      <Button variant="outline" size="sm" disabled={page === 1}>
        前へ
      </Button>
      <span className="text-sm text-muted-foreground">
        {page} / {totalPages}
      </span>
      <Button variant="outline" size="sm" disabled={page === totalPages}>
        次へ
      </Button>
    </div>
  </CardContent>
</Card>
```

## 固定スクロールバー（テーブル横スクロール）

テーブルの横スクロールバーを画面下部に固定表示するパターン。縦スクロールしなくても横スクロールバーにアクセスできる。

### 実装方法

1. テーブル本体は `overflow-x-hidden` でスクロールバーを非表示
2. テーブルの下に、テーブル幅と同じダミー要素を持つスクロールバーを `sticky bottom-0` で配置
3. 両者のスクロールをJavaScriptで同期

### 実装例

```tsx
import { useCallback, useEffect, useRef, useState } from "react";

function TableWithStickyScrollbar() {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const isScrollingSyncRef = useRef(false);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);

  // テーブルの幅を監視
  useEffect(() => {
    const updateScrollWidth = () => {
      if (tableContainerRef.current) {
        setTableScrollWidth(tableContainerRef.current.scrollWidth);
      }
    };

    updateScrollWidth();

    const resizeObserver = new ResizeObserver(updateScrollWidth);
    if (tableContainerRef.current) {
      resizeObserver.observe(tableContainerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [data]); // dataが変わったら幅を再計算

  // テーブルのスクロールをスクロールバーに同期
  const handleTableScroll = useCallback(() => {
    if (isScrollingSyncRef.current) return;
    if (tableContainerRef.current && scrollbarRef.current) {
      isScrollingSyncRef.current = true;
      scrollbarRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
      isScrollingSyncRef.current = false;
    }
  }, []);

  // スクロールバーのスクロールをテーブルに同期
  const handleScrollbarScroll = useCallback(() => {
    if (isScrollingSyncRef.current) return;
    if (tableContainerRef.current && scrollbarRef.current) {
      isScrollingSyncRef.current = true;
      tableContainerRef.current.scrollLeft = scrollbarRef.current.scrollLeft;
      isScrollingSyncRef.current = false;
    }
  }, []);

  return (
    <div className="border rounded-lg relative">
      {/* テーブル本体 */}
      <div
        ref={tableContainerRef}
        className="overflow-x-hidden"
        onScroll={handleTableScroll}
      >
        <table className="w-full min-w-160">
          {/* テーブル内容 */}
        </table>
      </div>

      {/* 固定スクロールバー */}
      <div
        ref={scrollbarRef}
        className="overflow-x-scroll sticky bottom-0 bg-background border-t"
        onScroll={handleScrollbarScroll}
      >
        <div style={{ width: tableScrollWidth, height: 1 }} />
      </div>
    </div>
  );
}
```

### ポイント

- `tableScrollWidth` でテーブルの実際の幅を取得し、ダミー要素に反映
- `ResizeObserver` でコンテナ幅の変化を監視（サイドバー開閉時など）
- `isScrollingSyncRef` で無限ループを防止
- テーブル本体は `overflow-x-hidden` でスクロールバーを非表示にし、固定スクロールバーのみ表示

### 使用例

- 組織図メニュー: `app/(menus)/(user)/organization-chart/components/MemberGrid.tsx`

---

## モーダル（Dialog）

### 作成・編集フォーム用

```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="sm:max-w-[500px]">
    <DialogHeader>
      <DialogTitle>新規作成</DialogTitle>
    </DialogHeader>
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">名前</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
          キャンセル
        </Button>
        <Button type="submit">作成</Button>
      </div>
    </form>
  </DialogContent>
</Dialog>
```

### FormModalコンポーネント（複雑なフォーム用）

```tsx
import { FormModal } from "@/components/modals/FormModal";

<FormModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onSubmit={handleSubmit}
  title="新規作成"
  submitLabel="作成"
  cancelLabel="キャンセル"
  language="ja"
  maxWidth="2xl"
>
  {/* フォームフィールド */}
</FormModal>
```

## 空状態（Empty State）

```tsx
{data.length === 0 && (
  <div className="text-center py-12 text-muted-foreground">
    <Icon className="w-12 h-12 mx-auto mb-4 opacity-50" />
    <p>データがありません</p>
  </div>
)}
```

## ローディング状態（Skeleton）

### 概要

Skeletonは、データ読み込み中に**実際のコンテンツの形状を模したプレースホルダー**を表示するコンポーネント。スピナーよりも優れたUXを提供する。

```tsx
import { Skeleton } from "@/components/ui/skeleton";

// 基本的な使い方
<Skeleton className="h-4 w-24" />        // テキスト
<Skeleton className="h-10 w-10 rounded-full" />  // アバター
<Skeleton className="h-5 w-16 rounded-full" />   // バッジ
```

### Skeleton化が効果的なパターン

| パターン | 理由 | 例 |
|---------|------|-----|
| **外部API呼び出し** | ネットワーク遅延が発生しやすい | Googleカレンダー連携 |
| **大量データの取得** | DBクエリに時間がかかる | 社員一覧、評価一覧 |
| **複数APIの並行呼び出し** | すべて揃うまで待つ | ダッシュボード |
| **初回表示が重要な画面** | 第一印象に影響 | ダッシュボード |
| **リスト/テーブル表示** | 形状が予測しやすい | 組織図、評価一覧 |

### Skeleton化が不要なパターン

| パターン | 理由 |
|---------|------|
| **100ms以下で完了** | Skeletonがチラつくだけ |
| **静的コンテンツ** | データ取得がない |
| **フォーム入力画面** | 入力欄は最初から表示すべき |
| **モーダル/ダイアログ** | 開く前にデータを取得済みが望ましい |
| **頻繁に更新される部分** | 毎回Skeletonが出ると煩わしい |

### 判断基準

```
データ取得に 200ms以上 かかる可能性がある？
  → はい: Skeleton化を検討
  → いいえ: 不要（単純なスピナーで十分）
```

### 実装例：テーブルのSkeleton

```tsx
if (loading) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>名前</TableHead>
          <TableHead>役職</TableHead>
          <TableHead>ステータス</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(8)].map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-16" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-16 rounded-full" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### 実装例：カードグリッドのSkeleton

```tsx
if (loading) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  );
}
```

### 実装例：ツリービューのSkeleton

```tsx
if (loading) {
  return (
    <div className="space-y-2">
      {/* ルートノード */}
      <div className="flex items-center justify-between p-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-10 rounded-full" />
      </div>
      {/* 子ノード */}
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-1">
          <Skeleton className="h-6 w-6" />
          <div className="flex-1 flex items-center justify-between p-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

### ポイント

- **実際のUIの形状を模倣する**: ユーザーが「何が表示されるか」を予測できる
- **テーブルヘッダーは実際の列名を表示**: 構造がわかりやすい
- **適切な数のプレースホルダー**: 8〜10個程度が一般的

## フォーム要素

### 標準入力

```tsx
<div className="space-y-2">
  <Label htmlFor="field">
    フィールド名 <span className="text-red-500">*</span>
  </Label>
  <Input
    id="field"
    value={value}
    onChange={(e) => setValue(e.target.value)}
    placeholder="入力してください"
  />
</div>
```

### セレクト

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

<Select value={value} onValueChange={setValue}>
  <SelectTrigger className="w-[200px]">
    <SelectValue placeholder="選択してください" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">オプション1</SelectItem>
    <SelectItem value="option2">オプション2</SelectItem>
  </SelectContent>
</Select>
```

## バッジ

### ロールバッジ（ダークモード対応）

```tsx
const roleColors = {
  ADMIN: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  MANAGER: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  USER: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  GUEST: "bg-muted text-muted-foreground",
};

<Badge className={roleColors[role]}>{role}</Badge>
```

### ステータスバッジ

```tsx
// 有効
<Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
  有効
</Badge>

// 無効
<Badge className="bg-muted text-muted-foreground">
  無効
</Badge>

// 警告
<Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
  未登録
</Badge>
```

## タイポグラフィ

```tsx
// ページタイトル（Headerで表示）
<h1 className="text-xl font-bold text-foreground">

// セクションタイトル
<h2 className="text-xl font-semibold text-foreground">

// カードタイトル
<h3 className="text-lg font-semibold text-foreground">

// ラベル
<Label className="text-sm font-medium text-foreground">

// 本文
<p className="text-sm text-muted-foreground">

// 小さいテキスト
<span className="text-xs text-muted-foreground">
```

## スペーシング

| 用途 | クラス |
|------|--------|
| カード内パディング | `p-6` または `p-8` |
| セクション間 | `space-y-6` |
| フォーム要素間 | `space-y-4` |
| ボタン間 | `gap-3` |
| アイコンとテキスト間 | `gap-2` または `gap-3` |
| ページとヘッダータブ間 | `mt-8` |

## 戻るボタン（BackButton）

```tsx
import { BackButton } from "@/components/ui/BackButton";

// アイコンのみ（推奨）
<BackButton href="/parent-page" />

// ラベル付き
<BackButton href="/parent-page" label="一覧に戻る" />

// onClick対応
<BackButton onClick={() => setSelectedItem(null)} />
```

## ロールカラースキーム

テンプレートのウェルカムカード等で使用するロール別カラー:

| ロール | 色 | Tailwind クラス |
|--------|-----|-----------------|
| GUEST | グレー | `bg-gray-600` |
| USER | 青/シアン | `bg-blue-600` / `bg-cyan-700` |
| MANAGER | 緑 | `bg-green-600` / `bg-green-700` |
| EXECUTIVE | ローズ | `bg-rose-600` / `bg-rose-700` |
| ADMIN | 紫 | `bg-purple-600` / `bg-purple-700` |

---

## レスポンシブ対応

### ブレークポイント

| サイズ | 幅 | サイドバー表示 |
|--------|-----|---------------|
| モバイル | < 768px | オーバーレイ（Sheet） |
| タブレット | 768px - 1023px | オーバーレイ（Sheet） |
| デスクトップ | >= 1024px | 固定表示 |

**ベース端末**: iPad Mini（768×1024）

### フック

```typescript
import { useIsMobile, useIsTabletOrMobile } from "@/hooks/use-mobile";

// モバイルのみ（768px未満）
const isMobile = useIsMobile();

// タブレット含む（1024px未満）
const isTabletOrMobile = useIsTabletOrMobile();
```

### サイドバー動作

- **デスクトップ**: 固定表示、幅調整ハンドル（ResizeHandle）あり
- **タブレット/モバイル**: オーバーレイ表示（Sheet）、ハンバーガーメニューで開閉

### 実装時の注意

```typescript
// ✅ タブレット対応のレイアウト
const isTabletOrMobile = useIsTabletOrMobile();
<div style={{ left: isTabletOrMobile ? "0" : `${sidebarWidth}px` }}>

// ❌ モバイルのみの判定（タブレットで問題発生）
const isMobile = useIsMobile();
<div style={{ left: isMobile ? "0" : `${sidebarWidth}px` }}>
```

---

## チェックリスト

新しいUIを作成する際:

- [ ] ハードコード色を使用していない（`bg-white`, `text-gray-*` など禁止）
- [ ] セマンティックカラーを使用（`bg-card`, `text-foreground` など）
- [ ] カラー背景には `dark:` バリアントを追加
- [ ] shadcn/ui コンポーネントを使用
- [ ] 適切なスペーシングを適用
- [ ] 空状態を実装
- [ ] モバイル対応を考慮（useIsTabletOrMobile）
- [ ] ローディング状態を実装（200ms以上かかる場合はSkeleton）
