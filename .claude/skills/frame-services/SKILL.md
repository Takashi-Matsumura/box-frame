---
name: フレーム基盤サービス
description: フローティングウィンドウ、監査ログ、アナウンス機能。フレーム基盤機能の利用・拡張時に使用。
---

# フレーム基盤サービス

モジュールではなく、モジュールが利用するインフラストラクチャ機能。

---

## フローティングウィンドウ

メイン画面と同時に操作可能なフローティングサブウィンドウ。

### 機能

| 機能 | 説明 |
|------|------|
| ドラッグ移動 | タイトルバーをドラッグ |
| リサイズ | 四辺・四隅をドラッグ |
| 最小化 | タスクバー風に左下表示 |
| 最大化 | 全画面（ダブルクリック可） |
| 閉じる | ボタン or ESCキー |

### 使用方法

```typescript
"use client";

import { FloatingWindow } from "@/components/ui/floating-window";
import { useFloatingWindowStore } from "@/lib/stores/floating-window-store";

export default function MyPage() {
  const { open, isOpen } = useFloatingWindowStore();

  const handleOpen = () => {
    open({
      title: "Window Title",
      titleJa: "ウィンドウタイトル",
      content: <div>Your content here</div>,
      initialPosition: { x: 200, y: 150 },
      initialSize: { width: 450, height: 400 },
    });
  };

  return (
    <div>
      <button onClick={handleOpen} disabled={isOpen}>Open</button>
      <FloatingWindow language="ja" />
    </div>
  );
}
```

### ストアAPI

```typescript
const {
  isOpen,       // 開いているか
  isMinimized,  // 最小化か
  isMaximized,  // 最大化か
  position,     // { x, y }
  size,         // { width, height }
  open,         // 開く
  close,        // 閉じる
  minimize,     // 最小化
  maximize,     // 最大化
  restore,      // 復元
  setPosition,  // 位置設定
  setSize,      // サイズ設定
  setContent,   // コンテンツ変更
} = useFloatingWindowStore();
```

### 注意事項

- サブウィンドウは1つのみ
- z-index: 100（Header上、BaseModal下）
- メイン画面は同時操作可能
- ESCキーで閉じる（最小化中は無効）

---

## 監査ログ

管理者操作とログイン履歴を記録・閲覧。

### 記録対象

| カテゴリ | アクション |
|---------|-----------|
| AUTH | LOGIN_SUCCESS, LOGIN_FAILURE |
| USER_MANAGEMENT | USER_DELETE, USER_ROLE_CHANGE |
| SYSTEM_SETTING | ANNOUNCEMENT_CREATE/UPDATE/DELETE, AI_CONFIG_UPDATE |
| MODULE | MODULE_TOGGLE |

### 使用方法

```typescript
import { AuditService } from "@/lib/services/audit-service";

// 監査ログを記録
await AuditService.log({
  action: "USER_DELETE",
  category: "USER_MANAGEMENT",
  userId: session.user.id,
  targetId: deletedUserId,
  targetType: "User",
  details: { deletedUserName: "user@example.com" },
}).catch(() => {}); // 失敗してもメイン処理に影響させない

// ログを取得
const { logs, total } = await AuditService.getLogs({
  category: "AUTH",
  limit: 25,
  offset: 0,
});
```

### 管理画面

`/admin?tab=audit` でフィルタリング・ページネーション付きで閲覧。

---

## システムアナウンス

全ユーザーへの告知バナー。

### 機能

- ヘッダー上部にバナー表示
- ユーザーが閉じられる（セッション中のみ非表示）
- 開始日時・終了日時を設定可能
- 重要度レベル（info, warning, critical）

### レベル別スタイル

| レベル | 色 | 用途 |
|--------|-----|------|
| info | 青色 | 一般的なお知らせ |
| warning | 黄色 | 注意喚起 |
| critical | 赤色 | 重要な警告 |

### 管理画面

`/admin?tab=announcements` で作成・編集・削除・有効/無効切り替え。

### API

| メソッド | パス | 用途 |
|---------|------|------|
| GET | `/api/announcements` | 現在有効なアナウンス取得 |
| GET | `/api/admin/announcements` | 全アナウンス取得（管理者） |
| POST | `/api/admin/announcements` | 作成（管理者） |
| PATCH | `/api/admin/announcements/[id]` | 更新（管理者） |
| DELETE | `/api/admin/announcements/[id]` | 削除（管理者） |
