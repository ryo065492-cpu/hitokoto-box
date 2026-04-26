import { NextResponse, type NextRequest } from "next/server";
import { APP_SCHEMA_VERSION, DEFAULT_SETTINGS, type Entry, type EntrySource } from "@/domain/types";
import { refreshServerDerivedDataSafely } from "@/lib/server/derivedData";
import { requirePasscodeSession } from "@/lib/server/passcode";
import { createServerRepository } from "@/lib/server/serverRepository";
import { createId } from "@/lib/utils/id";

const MAX_ENTRY_TEXT_LENGTH = 2000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_POSTS = 20;
const postBuckets = new Map<string, number[]>();

function repositoryUnavailableResponse(): NextResponse {
  return NextResponse.json(
    { ok: false, message: "保存先の設定がまだ完了していません。" },
    { status: 503 }
  );
}

function getRepositoryOrResponse(): ReturnType<typeof createServerRepository> | NextResponse {
  try {
    return createServerRepository();
  } catch {
    return repositoryUnavailableResponse();
  }
}

function clientKey(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function rateLimitResponseIfNeeded(request: NextRequest): NextResponse | undefined {
  const key = clientKey(request);
  const now = Date.now();
  const recent = (postBuckets.get(key) ?? []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_MAX_POSTS) {
    postBuckets.set(key, recent);
    return NextResponse.json(
      { ok: false, message: "少し時間を置いてからもう一度お試しください。" },
      { status: 429 }
    );
  }

  recent.push(now);
  postBuckets.set(key, recent);
  return undefined;
}

function validateEntry(entry: Entry | undefined): NextResponse | undefined {
  const text = entry?.text?.trim() ?? "";

  if (!entry || !text) {
    return NextResponse.json({ ok: false, message: "残す内容が見つかりませんでした。" }, { status: 400 });
  }

  if (text.length > MAX_ENTRY_TEXT_LENGTH) {
    return NextResponse.json(
      { ok: false, message: "少し長すぎるようです。短くしてからもう一度お試しください。" },
      { status: 400 }
    );
  }

  return undefined;
}

function toEntrySource(source: string | undefined): EntrySource {
  return source === "voice" || source === "photo" || source === "mixed" ? source : "text";
}

function buildServerEntry(entry: Entry): Entry {
  const now = new Date().toISOString();

  return {
    id: createId("entry"),
    memberId: DEFAULT_SETTINGS.defaultMemberId,
    text: entry.text.trim(),
    mediaIds: [],
    source: toEntrySource(entry.source),
    visibility: "family",
    createdAt: now,
    updatedAt: now,
    schemaVersion: APP_SCHEMA_VERSION
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const unauthorized = requirePasscodeSession(request);

  if (unauthorized) {
    return unauthorized;
  }

  const repository = getRepositoryOrResponse();

  if (repository instanceof NextResponse) {
    return repository;
  }

  const id = request.nextUrl.searchParams.get("id");

  if (id) {
    const entry = await repository.getEntry(id);
    return NextResponse.json({ entry });
  }

  const limitValue = request.nextUrl.searchParams.get("limit");
  const parsedLimit = limitValue ? Number(limitValue) : 50;
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50) : 50;
  const entries = await repository.listEntries({ limit });
  return NextResponse.json({ entries });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rateLimitResponse = rateLimitResponseIfNeeded(request);

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const repository = getRepositoryOrResponse();

  if (repository instanceof NextResponse) {
    return repository;
  }

  const body = (await request.json().catch(() => ({}))) as { entry?: Entry };
  const validationResponse = validateEntry(body.entry);

  if (validationResponse) {
    return validationResponse;
  }

  const entry = await repository.createEntry(buildServerEntry(body.entry!));
  await refreshServerDerivedDataSafely(repository);

  return NextResponse.json({ ok: true, entry });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const unauthorized = requirePasscodeSession(request);

  if (unauthorized) {
    return unauthorized;
  }

  const repository = getRepositoryOrResponse();

  if (repository instanceof NextResponse) {
    return repository;
  }

  const id = request.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ ok: false, message: "削除する内容が見つかりませんでした。" }, { status: 400 });
  }

  await repository.deleteEntry(id);
  await refreshServerDerivedDataSafely(repository);

  return NextResponse.json({ ok: true });
}
