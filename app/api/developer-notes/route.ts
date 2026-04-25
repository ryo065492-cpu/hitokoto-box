import { NextResponse, type NextRequest } from "next/server";
import type { DeveloperNote } from "@/domain/types";
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
    const notes = await createServerRepository().listDeveloperNotes();
    return NextResponse.json({ notes });
  } catch {
    return unavailable();
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const unauthorized = requirePasscodeSession(request);

  if (unauthorized) {
    return unauthorized;
  }

  const body = (await request.json().catch(() => ({}))) as { note?: DeveloperNote };

  if (!body.note) {
    return NextResponse.json({ ok: false, message: "保存するメモが見つかりませんでした。" }, { status: 400 });
  }

  try {
    const note = await createServerRepository().createDeveloperNote(body.note);
    return NextResponse.json({ ok: true, note });
  } catch {
    return unavailable();
  }
}
