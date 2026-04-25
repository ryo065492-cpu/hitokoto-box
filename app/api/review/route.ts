import { NextResponse, type NextRequest } from "next/server";
import { getWeekRange } from "@/lib/dates/week";
import { requirePasscodeSession } from "@/lib/server/passcode";
import { createServerRepository } from "@/lib/server/serverRepository";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const unauthorized = requirePasscodeSession(request);

  if (unauthorized) {
    return unauthorized;
  }

  let repository: ReturnType<typeof createServerRepository>;

  try {
    repository = createServerRepository();
  } catch {
    return NextResponse.json(
      { ok: false, message: "保存先の設定がまだ完了していません。" },
      { status: 503 }
    );
  }

  const { weekStart } = getWeekRange(new Date());
  const [entries, weeklyInsights] = await Promise.all([
    repository.listEntries({ limit: 3 }),
    repository.listWeeklyInsights(weekStart)
  ]);

  return NextResponse.json({
    recentEntries: entries.map((entry) => ({ ...entry, photoCount: entry.mediaIds.length })),
    themes: weeklyInsights.slice(0, 3).map((insight) => ({
      title: insight.title,
      summary: insight.summary
    }))
  });
}
