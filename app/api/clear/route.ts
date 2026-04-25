import { NextResponse, type NextRequest } from "next/server";
import { requirePasscodeSession } from "@/lib/server/passcode";
import { createServerRepository } from "@/lib/server/serverRepository";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const unauthorized = requirePasscodeSession(request);

  if (unauthorized) {
    return unauthorized;
  }

  try {
    await createServerRepository().clearAllData();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, message: "保存先の設定がまだ完了していません。" },
      { status: 503 }
    );
  }
}
