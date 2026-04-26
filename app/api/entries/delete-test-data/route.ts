import { NextResponse, type NextRequest } from "next/server";
import { refreshServerDerivedDataSafely } from "@/lib/server/derivedData";
import { requirePasscodeSession } from "@/lib/server/passcode";
import { createServerRepository } from "@/lib/server/serverRepository";

const TEST_DATA_PATTERNS = ["テスト", "あとで消してOK"];

export async function POST(request: NextRequest): Promise<NextResponse> {
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

  const entries = await repository.listEntries({ limit: 500 });
  const targets = entries.filter((entry) =>
    TEST_DATA_PATTERNS.some((pattern) => entry.text.includes(pattern))
  );

  for (const entry of targets) {
    await repository.deleteEntry(entry.id);
  }

  if (targets.length) {
    await refreshServerDerivedDataSafely(repository);
  }

  return NextResponse.json({ ok: true, deletedCount: targets.length });
}
