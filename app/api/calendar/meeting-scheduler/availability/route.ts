import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface BusySlot {
  userId: string;
  start: Date;
  end: Date;
}

interface AvailableSlot {
  start: string; // ISO 8601
  end: string; // ISO 8601
}

/**
 * POST /api/calendar/meeting-scheduler/availability
 *
 * 複数ユーザーの空き時間を検索します。
 * アプリイベントのみを対象とし、Google Calendarは除外。
 *
 * @example リクエスト
 * ```json
 * {
 *   "participantUserIds": ["user1", "user2", "user3"],
 *   "dateRange": {
 *     "start": "2024-01-15",
 *     "end": "2024-01-19"
 *   },
 *   "duration": 60,
 *   "workingHours": { "start": 9, "end": 18 }
 * }
 * ```
 *
 * @example レスポンス
 * ```json
 * {
 *   "busySlots": [
 *     { "userId": "user1", "start": "2024-01-15T10:00:00", "end": "2024-01-15T11:00:00" }
 *   ],
 *   "availableSlots": [
 *     { "start": "2024-01-15T09:00:00", "end": "2024-01-15T10:00:00" },
 *     { "start": "2024-01-15T11:00:00", "end": "2024-01-15T12:00:00" }
 *   ]
 * }
 * ```
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { participantUserIds, dateRange, duration, workingHours } = body;

    // バリデーション
    if (!Array.isArray(participantUserIds) || participantUserIds.length === 0) {
      return NextResponse.json(
        { error: "participantUserIds must be a non-empty array" },
        { status: 400 },
      );
    }

    if (!dateRange?.start || !dateRange?.end) {
      return NextResponse.json(
        { error: "dateRange with start and end is required" },
        { status: 400 },
      );
    }

    const durationMinutes = typeof duration === "number" ? duration : 60;
    const workStart = workingHours?.start ?? 9;
    const workEnd = workingHours?.end ?? 18;

    // 検索対象ユーザーに自分自身を追加
    const allUserIds = [...new Set([session.user.id, ...participantUserIds])];

    // 検索期間を設定
    const startDate = new Date(`${dateRange.start}T00:00:00`);
    const endDate = new Date(`${dateRange.end}T23:59:59`);

    // 全員のCalendarEventを取得（アプリイベントのみ）
    const events = await prisma.calendarEvent.findMany({
      where: {
        userId: { in: allUserIds },
        startTime: { lte: endDate },
        endTime: { gte: startDate },
      },
      select: {
        userId: true,
        startTime: true,
        endTime: true,
        allDay: true,
      },
      orderBy: { startTime: "asc" },
    });

    // 予定をBusySlotに変換
    const busySlots: BusySlot[] = events.map((event) => ({
      userId: event.userId,
      start: event.startTime,
      end: event.endTime,
    }));

    // 空きスロットを計算
    const availableSlots = findAvailableSlots(
      busySlots,
      startDate,
      endDate,
      durationMinutes,
      workStart,
      workEnd,
    );

    return NextResponse.json({
      busySlots: busySlots.map((slot) => ({
        userId: slot.userId,
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
      })),
      availableSlots,
    });
  } catch (error) {
    console.error("Error finding availability:", error);
    const message =
      error instanceof Error ? error.message : "Failed to find availability";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * 空きスロットを検索
 */
function findAvailableSlots(
  busySlots: BusySlot[],
  startDate: Date,
  endDate: Date,
  durationMinutes: number,
  workStart: number,
  workEnd: number,
): AvailableSlot[] {
  const availableSlots: AvailableSlot[] = [];
  const slotInterval = 30; // 30分刻みで候補を生成

  // 日付ごとにループ
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    // 週末をスキップ（オプション）
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    // 営業時間内の候補スロットを生成
    for (let hour = workStart; hour < workEnd; hour++) {
      for (let minute = 0; minute < 60; minute += slotInterval) {
        const slotStart = new Date(currentDate);
        slotStart.setHours(hour, minute, 0, 0);

        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);

        // 営業時間を超える場合はスキップ
        if (
          slotEnd.getHours() > workEnd ||
          (slotEnd.getHours() === workEnd && slotEnd.getMinutes() > 0)
        ) {
          continue;
        }

        // 現在時刻より前はスキップ
        const now = new Date();
        if (slotStart < now) {
          continue;
        }

        // すべての予定と重複チェック
        const hasConflict = busySlots.some((busy) => {
          return slotStart < busy.end && slotEnd > busy.start;
        });

        if (!hasConflict) {
          availableSlots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
          });
        }
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // スロット数を制限（最大50件）
  return availableSlots.slice(0, 50);
}
