import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AIService } from "@/lib/core-modules/ai";

// POST /api/calendar/holidays/generate - AIで祝日を自動生成
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admin only
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { year } = body;

  if (!year || typeof year !== "number") {
    return NextResponse.json(
      { error: "Year is required" },
      { status: 400 }
    );
  }

  try {
    // Use AI to generate holidays for the year
    const input = `Generate a list of Japanese national holidays for the year ${year}.
Return ONLY a valid JSON array with no additional text, markdown, or explanation.
Each holiday should have these fields:
- date: string in "YYYY-MM-DD" format
- name: string (Japanese name)
- nameEn: string (English name)
- type: "national"

Include all standard Japanese national holidays:
- 元日 (New Year's Day) - January 1
- 成人の日 (Coming of Age Day) - Second Monday of January
- 建国記念の日 (National Foundation Day) - February 11
- 天皇誕生日 (Emperor's Birthday) - February 23
- 春分の日 (Vernal Equinox Day) - Around March 20-21
- 昭和の日 (Showa Day) - April 29
- 憲法記念日 (Constitution Memorial Day) - May 3
- みどりの日 (Greenery Day) - May 4
- こどもの日 (Children's Day) - May 5
- 海の日 (Marine Day) - Third Monday of July
- 山の日 (Mountain Day) - August 11
- 敬老の日 (Respect for the Aged Day) - Third Monday of September
- 秋分の日 (Autumnal Equinox Day) - Around September 22-23
- スポーツの日 (Sports Day) - Second Monday of October
- 文化の日 (Culture Day) - November 3
- 勤労感謝の日 (Labor Thanksgiving Day) - November 23

Also include any substitute holidays (振替休日) when a national holiday falls on Sunday.

Return ONLY the JSON array, no other text.`;

    const systemPrompt = "You are a helpful assistant that generates accurate Japanese holiday data. Return only valid JSON arrays with no markdown formatting or additional text.";

    const result = await AIService.generate({
      input,
      systemPrompt,
      temperature: 0.1,
    });

    // Parse AI response
    let holidays: Array<{
      date: string;
      name: string;
      nameEn: string;
      type: string;
    }>;

    try {
      // Try to extract JSON from the response
      let jsonStr = result.output.trim();

      // Remove markdown code blocks if present
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }

      holidays = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", result.output);
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    // Validate and insert holidays
    const createdHolidays = [];
    for (const h of holidays) {
      if (!h.date || !h.name) continue;

      try {
        const holiday = await prisma.holiday.create({
          data: {
            date: new Date(h.date),
            name: h.name,
            nameEn: h.nameEn || null,
            type: h.type || "national",
          },
        });
        createdHolidays.push({
          id: holiday.id,
          date: holiday.date.toISOString().split("T")[0],
          name: holiday.name,
          nameEn: holiday.nameEn,
          type: holiday.type,
        });
      } catch (err) {
        // Skip duplicates
        console.warn("Skipping duplicate holiday:", h.date, h.name, err);
      }
    }

    return NextResponse.json({
      holidays: createdHolidays,
      generated: createdHolidays.length,
    });
  } catch (error) {
    console.error("Failed to generate holidays:", error);
    return NextResponse.json(
      { error: "Failed to generate holidays" },
      { status: 500 }
    );
  }
}
