import { NextResponse, type NextRequest } from "next/server";
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

  const weekStart = request.nextUrl.searchParams.get("weekStart") ?? undefined;
  const insights = await repository.listWeeklyInsights(weekStart);

  return NextResponse.json({ insights: insights.slice(0, 3) });
}
