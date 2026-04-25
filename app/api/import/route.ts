import { NextResponse, type NextRequest } from "next/server";
import type { ExportDataBundle } from "@/domain/types";
import { refreshServerDerivedDataSafely } from "@/lib/server/derivedData";
import { requirePasscodeSession } from "@/lib/server/passcode";
import { createServerRepository } from "@/lib/server/serverRepository";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const unauthorized = requirePasscodeSession(request);

  if (unauthorized) {
    return unauthorized;
  }

  const body = (await request.json().catch(() => ({}))) as { data?: ExportDataBundle };

  if (!body.data) {
    return NextResponse.json({ ok: false, message: "読み込むデータが見つかりませんでした。" }, { status: 400 });
  }

  try {
    const repository = createServerRepository();
    await repository.importAllData(body.data);
    await refreshServerDerivedDataSafely(repository);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, message: "保存先の設定がまだ完了していません。" },
      { status: 503 }
    );
  }
}
