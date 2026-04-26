import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/entries/delete-test-data/route";

const now = "2026-04-25T00:00:00.000Z";

function adminCookie(passcode: string): string {
  const value = createHmac("sha256", passcode).update("hitokoto-bako:admin").digest("base64url");
  return `hitokoto_admin_session=${value}`;
}

function request(withAdmin = false): NextRequest {
  return new NextRequest("http://localhost/api/entries/delete-test-data", {
    method: "POST",
    headers: withAdmin ? { cookie: adminCookie("admin-secret") } : undefined
  });
}

function stubCloudEnv(): void {
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
}

function stubSupabaseFetch(): ReturnType<typeof vi.fn> {
  const rows = [
    {
      id: "11111111-1111-4111-8111-111111111111",
      text: "テストです",
      source: "text",
      created_at: now,
      updated_at: now
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      text: "買い物メモ",
      source: "text",
      created_at: now,
      updated_at: now
    }
  ];

  const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const urlString = String(url);

    if (urlString.includes("/entries?select=")) {
      return Response.json(rows);
    }

    if (urlString.includes("/attachments")) {
      return Response.json([]);
    }

    if (init?.method === "DELETE") {
      return new Response(null, { status: 204 });
    }

    return Response.json([]);
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("delete test data route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("requires an admin session", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_PASSCODE", "admin-secret");
    stubCloudEnv();

    const response = await POST(request(false));

    expect(response.status).toBe(401);
  });

  it("deletes entries that look like test data", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_PASSCODE", "admin-secret");
    stubCloudEnv();
    const fetchMock = stubSupabaseFetch();

    const response = await POST(request(true));
    const body = (await response.json()) as { ok: boolean; deletedCount: number };
    const deleteCalls = fetchMock.mock.calls.filter(([, init]) => init?.method === "DELETE");

    expect(response.status).toBe(200);
    expect(body.deletedCount).toBe(1);
    expect(deleteCalls.some(([url]) => String(url).includes("/entries?id=eq."))).toBe(true);
  });
});
