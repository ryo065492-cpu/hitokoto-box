import { NextResponse, type NextRequest } from "next/server";
import type { AmmoStatus } from "@/lib/arsenal/ammo";
import { requirePasscodeSession } from "@/lib/server/passcode";
import { createServerAmmoStatusRepository } from "@/lib/server/ammoStatusRepository";

const VALID_STATUSES = new Set<AmmoStatus>(["candidate", "selected", "parked", "ignored", "done"]);

type StatusBody = {
  ammo_key?: string;
  source_entry_ids?: string[];
  title?: string;
  status?: string;
  note?: string;
};

function unavailable(): NextResponse {
  return NextResponse.json(
    { ok: false, message: "保存先の設定がまだ完了していません。" },
    { status: 503 }
  );
}

function badRequest(message: string): NextResponse {
  return NextResponse.json({ ok: false, message }, { status: 400 });
}

function parseStatus(value: string | undefined): AmmoStatus | undefined {
  return value && VALID_STATUSES.has(value as AmmoStatus) ? (value as AmmoStatus) : undefined;
}

function sourceEntryIds(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const unauthorized = requirePasscodeSession(request);

  if (unauthorized) {
    return unauthorized;
  }

  try {
    const statuses = await createServerAmmoStatusRepository().listStatuses();
    return NextResponse.json({ statuses });
  } catch {
    return unavailable();
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const unauthorized = requirePasscodeSession(request);

  if (unauthorized) {
    return unauthorized;
  }

  const body = (await request.json().catch(() => ({}))) as StatusBody;
  const status = parseStatus(body.status);

  if (!body.ammo_key || !body.title || !status) {
    return badRequest("ammo_key, title, and status are required.");
  }

  try {
    const saved = await createServerAmmoStatusRepository().upsertStatus({
      ammoKey: body.ammo_key,
      sourceEntryIds: sourceEntryIds(body.source_entry_ids),
      title: body.title,
      status,
      note: body.note
    });
    return NextResponse.json({ ok: true, status: saved });
  } catch {
    return unavailable();
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const unauthorized = requirePasscodeSession(request);

  if (unauthorized) {
    return unauthorized;
  }

  const body = (await request.json().catch(() => ({}))) as StatusBody;
  const status = parseStatus(body.status);

  if (!body.ammo_key || !status) {
    return badRequest("ammo_key and status are required.");
  }

  try {
    if (body.title) {
      const saved = await createServerAmmoStatusRepository().upsertStatus({
        ammoKey: body.ammo_key,
        sourceEntryIds: sourceEntryIds(body.source_entry_ids),
        title: body.title,
        status,
        note: body.note
      });
      return NextResponse.json({ ok: true, status: saved });
    }

    const saved = await createServerAmmoStatusRepository().updateStatus(body.ammo_key, status);
    return NextResponse.json({ ok: true, status: saved });
  } catch {
    return unavailable();
  }
}
