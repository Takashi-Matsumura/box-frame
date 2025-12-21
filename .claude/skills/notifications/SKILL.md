---
name: 通知機能ガイド
description: NotificationServiceの使い方、通知タイプ・優先度、APIエンドポイント。新機能実装時の通知発行、通知センター拡張時に使用。
---

# 通知機能ガイド

## 概要

アプリケーション内での重要なイベントをユーザに通知するシステム。

- **通知センター**: ヘッダーのベルアイコン
- **トースト通知**: Sonnerでリアルタイム表示
- **DB永続化**: PostgreSQL（Prisma）

## ファイル構成

```
lib/
├── services/
│   └── notification-service.ts   # 通知発行サービス
├── stores/
│   └── notification-store.ts     # Zustandストア
└── i18n/
    └── notifications.ts          # 翻訳

app/api/notifications/
├── route.ts                      # GET/POST
├── [id]/route.ts                 # PATCH/DELETE
├── read-all/route.ts             # 一括既読
└── unread-count/route.ts         # 未読数

components/notifications/
├── NotificationBell.tsx          # ベルアイコン
├── NotificationDropdown.tsx      # ドロップダウン
├── NotificationItem.tsx          # 個別アイテム
├── NotificationTypeIcon.tsx      # タイプ別アイコン
└── NotificationEmptyState.tsx    # 空状態
```

## 通知タイプ

| タイプ | 用途 | アイコン | 色 |
|-------|------|---------|-----|
| SYSTEM | システム通知 | Settings | 青 |
| SECURITY | セキュリティ | Shield | 赤 |
| ACTION | アクション要求 | Bell | 紫 |
| INFO | 一般情報 | Info | 灰 |
| WARNING | 警告 | AlertTriangle | 黄 |
| ERROR | エラー | AlertCircle | 赤 |

## 優先度

| 優先度 | 用途 |
|-------|------|
| URGENT | 緊急（即時対応必要） |
| HIGH | 重要なセキュリティイベント |
| NORMAL | 通常の通知 |
| LOW | 情報通知 |

## NotificationService API

### 基本インポート

```typescript
import { NotificationService } from "@/lib/services/notification-service";
```

### 特定ユーザへの通知

```typescript
// セキュリティ通知
await NotificationService.securityNotify(userId, {
  title: "New login detected",
  titleJa: "新しいログインを検出しました",
  message: "You have logged in successfully.",
  messageJa: "正常にログインしました。",
});

// システム通知
await NotificationService.systemNotify(userId, {
  title: "Settings updated",
  titleJa: "設定が更新されました",
  message: "Your preferences have been saved.",
  messageJa: "設定が保存されました。",
});

// アクション通知（クリック可能なリンク付き）
await NotificationService.actionNotify(userId, {
  title: "Approval required",
  titleJa: "承認が必要です",
  message: "A new request is pending your review.",
  messageJa: "新しいリクエストが承認待ちです。",
  actionUrl: "/approvals/123",
  actionLabel: "Review",
  actionLabelJa: "確認する",
});
```

### ブロードキャスト通知（特定ロールへ）

```typescript
await NotificationService.broadcast({
  role: "ADMIN",              // 対象ロール
  type: "SYSTEM",
  priority: "HIGH",
  title: "Configuration updated",
  titleJa: "設定が更新されました",
  message: "LDAP configuration has been changed.",
  messageJa: "LDAP設定が変更されました。",
  source: "LDAP",             // オプション: 通知元
});
```

### カスタム通知

```typescript
await NotificationService.create({
  userId: "user-id",
  type: "WARNING",
  priority: "NORMAL",
  title: "Session expiring",
  titleJa: "セッションが期限切れ間近です",
  message: "Your session will expire in 5 minutes.",
  messageJa: "セッションは5分後に期限切れになります。",
  expiresAt: new Date(Date.now() + 5 * 60 * 1000), // オプション: 有効期限
  metadata: { sessionId: "abc123" },               // オプション: メタデータ
});
```

## 実装パターン

### APIルートでの通知発行

```typescript
// app/api/example/route.ts
import { NotificationService } from "@/lib/services/notification-service";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ビジネスロジック
    const result = await doSomething();

    // 対象ユーザに通知
    await NotificationService.securityNotify(session.user.id, {
      title: "Action completed",
      titleJa: "アクションが完了しました",
      message: "Your request has been processed.",
      messageJa: "リクエストが処理されました。",
    }).catch((err) => {
      // 通知失敗はログのみ、メイン処理には影響させない
      console.error("[Example] Failed to create notification:", err);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

### 管理者への一斉通知

```typescript
// 全管理者に通知
await NotificationService.broadcast({
  role: "ADMIN",
  type: "SECURITY",
  priority: "HIGH",
  title: "User account deleted",
  titleJa: "ユーザーアカウントが削除されました",
  message: `User "${deletedUser.name}" has been deleted.`,
  messageJa: `ユーザー「${deletedUser.name}」が削除されました。`,
  source: "ADMIN",
  metadata: { userId: deletedUser.id },
}).catch((err) => {
  console.error("[Admin] Failed to create notification:", err);
});
```

## 現在の通知トリガー

### セキュリティイベント（対象ユーザへ通知）

| イベント | ファイル |
|---------|---------|
| ログイン成功（OpenLDAP） | `auth.ts` |
| ログイン成功（Google） | `auth.config.ts` |
| 2FA有効化 | `app/api/user/two-factor/enable/route.ts` |
| 2FA無効化 | `app/api/user/two-factor/disable/route.ts` |
| パスワード変更 | `app/api/auth/change-password/route.ts` |
| ロール変更 | `app/api/admin/change-role/route.ts` |
| アクセスキー作成/変更/削除 | `app/api/admin/access-keys/route.ts` |

### システムイベント（全管理者へ通知）

| イベント | ファイル |
|---------|---------|
| ユーザ削除 | `app/api/admin/users/[id]/route.ts` |
| OpenLDAP設定変更 | `app/api/admin/openldap-config/route.ts` |
| LDAP移行設定変更 | `app/api/admin/ldap-migration/route.ts` |
| 旧LDAP設定変更 | `app/api/admin/ldap-migration/route.ts` |
| モジュール有効/無効 | `app/api/admin/modules/route.ts` |

## 注意事項

### 通知は自動生成されない

新機能を実装する際、通知が必要な場合は開発者が明示的に `NotificationService` を呼び出す必要があります。

### 通知失敗はメイン処理に影響させない

```typescript
// ✅ 推奨: catch でログのみ
await NotificationService.securityNotify(userId, {...}).catch((err) => {
  console.error("Failed to create notification:", err);
});

// ❌ 避ける: 通知失敗で処理全体を失敗させる
await NotificationService.securityNotify(userId, {...}); // エラーがスローされる可能性
```

### 多言語対応を忘れない

```typescript
// ✅ 英語・日本語両方を指定
{
  title: "New login detected",
  titleJa: "新しいログインを検出しました",
  message: "You have logged in successfully.",
  messageJa: "正常にログインしました。",
}

// ❌ 英語のみ
{
  title: "New login detected",
  message: "You have logged in successfully.",
}
```

## チェックリスト

新しい通知を追加する際:

- [ ] 適切な通知タイプを選択（SYSTEM/SECURITY/ACTION/INFO/WARNING/ERROR）
- [ ] 適切な優先度を設定（URGENT/HIGH/NORMAL/LOW）
- [ ] 英語・日本語両方のタイトル・メッセージを指定
- [ ] 通知失敗時は `.catch()` でログのみ
- [ ] 必要に応じて `actionUrl` / `metadata` を追加
- [ ] ブロードキャストの場合は対象ロールを明確に
