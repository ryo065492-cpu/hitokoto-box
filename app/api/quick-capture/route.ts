import { NextResponse, type NextRequest } from "next/server";
import { APP_SCHEMA_VERSION, DEFAULT_SETTINGS, type Entry, type EntrySource } from "@/domain/types";
import { refreshServerDerivedDataSafely } from "@/lib/server/derivedData";
import { createServerRepository } from "@/lib/server/serverRepository";
import { createId } from "@/lib/utils/id";

interface QuickCaptureBody {
  token?: string;
  text?: string;
  source?: string;
  url?: string;
  title?: string;
}

function expectedToken(): string | undefined {
  return process.env.QUICK_CAPTURE_TOKEN?.trim() || undefined;
}

function buildEntryText(body: QuickCaptureBody): string {
  const text = body.text?.trim() ?? "";
  const title = body.title?.trim();
  const url = body.url?.trim();

  if (!title && !url) {
    return text;
  }

  const target = [title, url].filter(Boolean).join(" ");
  return [`あとで見る：${target}`, text ? `メモ：${text}` : undefined].filter(Boolean).join("\n");
}

function toQuickCaptureSource(source?: string): EntrySource {
  return source === "ios_share_sheet" || source === "ios_shortcut" ? source : "text";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json().catch(() => ({}))) as QuickCaptureBody;
  const rawText = body.text?.trim() ?? "";

  if (!rawText) {
    return NextResponse.json({ ok: false, message: "残す内容が見つかりませんでした" }, { status: 400 });
  }

  const text = buildEntryText(body);

  const token = expectedToken();

  if (!token) {
    return NextResponse.json(
      { ok: false, message: "ショートカット用の設定がまだ完了していません" },
      { status: 500 }
    );
  }

  if (body.token !== token) {
    return NextResponse.json({ ok: false, message: "残せませんでした" }, { status: 401 });
  }

  let repository: ReturnType<typeof createServerRepository>;

  try {
    repository = createServerRepository();
  } catch {
    return NextResponse.json(
      { ok: false, message: "保存先の設定がまだ完了していません" },
      { status: 503 }
    );
  }

  const now = new Date().toISOString();
  const entry: Entry = {
    id: createId("entry"),
    memberId: DEFAULT_SETTINGS.defaultMemberId,
    text,
    mediaIds: [],
    source: toQuickCaptureSource(body.source),
    visibility: "family",
    createdAt: now,
    updatedAt: now,
    schemaVersion: APP_SCHEMA_VERSION
  };

  try {
    await repository.createEntry(entry);
    await refreshServerDerivedDataSafely(repository);
    return NextResponse.json({ ok: true, message: "残しました" });
  } catch {
    return NextResponse.json({ ok: false, message: "残せませんでした" }, { status: 500 });
  }
}
