import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH, POST } from "../app/api/arsenal/statuses/route";
import type { AmmoItemStatus } from "../lib/arsenal/ammo";

const now = "2026-04-25T00:00:00.000Z";

function adminCookie(passcode: string): string {
  const value = createHmac("sha256", passcode).update("hitokoto-bako:admin").digest("base64url");
  return `hitokoto_admin_session=${value}`;
}

function request(method: string, body?: unknown, withAdmin = false): NextRequest {
  return new NextRequest("http://localhost/api/arsenal/statuses", {
    method,
    headers: {
      ...(withAdmin ? { cookie: adminCookie("admin-secret") } : {}),
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
}

function stubCloudEnv(): void {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("ADMIN_PASSCODE", "admin-secret");
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
}

function row(status = "selected") {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    ammo_key: "ammo_stable",
    source_entry_ids: ["entry_1"],
    title: "使いやすさの候補",
    status,
    note: null,
    updated_at: now,
    created_at: now
  };
}

function stubSupabaseFetch(): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const urlString = String(url);

    if (urlString.includes("/ammo_item_statuses?select=")) {
      return Response.json([row()]);
    }

    if (urlString.includes("/ammo_item_statuses?on_conflict=ammo_key")) {
      return Response.json([row("selected")]);
    }

    if (urlString.includes("/ammo_item_statuses?ammo_key=eq.") && init?.method === "PATCH") {
      const body = JSON.parse(String(init.body)) as { status: string };
      return Response.json([row(body.status)]);
    }

    return Response.json([]);
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("arsenal statuses route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("rejects GET without an admin session", async () => {
    stubCloudEnv();

    const response = await GET(request("GET"));

    expect(response.status).toBe(401);
  });

  it("returns statuses with an admin session", async () => {
    stubCloudEnv();
    stubSupabaseFetch();

    const response = await GET(request("GET", undefined, true));
    const body = (await response.json()) as { statuses: AmmoItemStatus[] };

    expect(response.status).toBe(200);
    expect(body.statuses[0]?.ammoKey).toBe("ammo_stable");
    expect(body.statuses[0]?.status).toBe("selected");
  });

  it("upserts a status with POST", async () => {
    stubCloudEnv();
    const fetchMock = stubSupabaseFetch();

    const response = await POST(
      request(
        "POST",
        {
          ammo_key: "ammo_stable",
          source_entry_ids: ["entry_1"],
          title: "使いやすさの候補",
          status: "selected"
        },
        true
      )
    );
    const upsertRequest = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("/ammo_item_statuses?on_conflict=ammo_key")
    );

    expect(response.status).toBe(200);
    expect(upsertRequest).toBeTruthy();
  });

  it("updates status with PATCH", async () => {
    stubCloudEnv();
    const fetchMock = stubSupabaseFetch();

    const response = await PATCH(
      request(
        "PATCH",
        {
          ammo_key: "ammo_stable",
          status: "parked"
        },
        true
      )
    );
    const body = (await response.json()) as { status: AmmoItemStatus };
    const patchRequest = fetchMock.mock.calls.find(
      ([url, init]) => String(url).includes("/ammo_item_statuses?ammo_key=eq.") && init?.method === "PATCH"
    );

    expect(response.status).toBe(200);
    expect(body.status.status).toBe("parked");
    expect(patchRequest).toBeTruthy();
  });
});
