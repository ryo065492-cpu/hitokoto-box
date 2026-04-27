import { NextResponse, type NextRequest } from "next/server";
import { buildArsenalView } from "@/lib/arsenal/ammo";
import { requirePasscodeSession } from "@/lib/server/passcode";
import { createServerRepository } from "@/lib/server/serverRepository";

function unavailable(): NextResponse {
  return NextResponse.json(
    { ok: false, message: "保存先の設定がまだ完了していません。" },
    { status: 503 }
  );
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const unauthorized = requirePasscodeSession(request);

  if (unauthorized) {
    return unauthorized;
  }

  try {
    const entries = await createServerRepository().listEntries({ limit: 50 });
    return NextResponse.json({ view: buildArsenalView(entries) });
  } catch {
    return unavailable();
  }
}
