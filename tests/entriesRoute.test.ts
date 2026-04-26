import { NextRequest } from "next/server";
import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { APP_SCHEMA_VERSION, DEFAULT_SETTINGS, type Entry } from "../domain/types";
import { DELETE, GET, POST } from "../app/api/entries/route";

const uuid = "11111111-1111-4111-8111-111111111111";
const now = "2026-04-25T00:00:00.000Z";

function createEntry(text = "また洗剤なくなってた"): Entry {
  return {
    id: `entry_${uuid}`,
    memberId: DEFAULT_SETTINGS.defaultMemberId,
    text,
    mediaIds: [],
    source: "text",
    visibility: "family",
    createdAt: now,
    updatedAt: now,
    schemaVersion: APP_SCHEMA_VERSION
  };
}

function request(body: unknown, ip = "203.0.113.10"): NextRequest {
  return new NextRequest("http://localhost/api/entries", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body)
  });
}

function adminCookie(passcode: string): string {
  const value = createHmac("sha256", passcode).update("hitokoto-bako:admin").digest("base64url");
  return `hitokoto_admin_session=${value}`;
}

function adminRequest(url: string): NextRequest {
  return new NextRequest(url, {
    headers: {
      cookie: adminCookie("admin-secret")
    }
  });
}

function stubCloudEnv(): void {
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
}

function stubSupabaseFetch(): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const urlString = String(url);

    if (urlString.includes("/entries?on_conflict=id")) {
      const body = JSON.parse(String(init?.body)) as { source: string; text: string };
      return new Response(
        JSON.stringify([
          {
            id: uuid,
            text: body.text,
            source: body.source,
            created_at: now,
            updated_at: now
          }
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (urlString.includes("/entries?select=")) {
      return new Response(
        JSON.stringify([
          {
            id: uuid,
            text: "また洗剤なくなってた",
            source: "text",
            created_at: now,
            updated_at: now
          }
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (urlString.includes("/attachments")) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (init?.method === "DELETE") {
      return new Response(null, { status: 204 });
    }

    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("entries route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("saves text without a passcode session", async () => {
    stubCloudEnv();
    const fetchMock = stubSupabaseFetch();

    const response = await POST(request({ entry: createEntry() }));
    const body = (await response.json()) as { ok: boolean; entry: Entry };
    const savedRequest = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("/entries?on_conflict=id")
    );

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.entry.text).toBe("また洗剤なくなってた");
    expect(savedRequest).toBeTruthy();
  });

  it("does not require OPENAI_API_KEY for normal text saving", async () => {
    stubCloudEnv();
    vi.stubEnv("OPENAI_API_KEY", "");
    const fetchMock = stubSupabaseFetch();

    const response = await POST(request({ entry: createEntry("普通に残す") }, "203.0.113.13"));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("rejects empty text", async () => {
    stubCloudEnv();
    stubSupabaseFetch();

    const response = await POST(request({ entry: createEntry("   ") }, "203.0.113.11"));

    expect(response.status).toBe(400);
  });

  it("rejects overly long text", async () => {
    stubCloudEnv();
    stubSupabaseFetch();

    const response = await POST(request({ entry: createEntry("あ".repeat(2001)) }, "203.0.113.12"));

    expect(response.status).toBe(400);
  });

  it("keeps reading entries behind the admin session", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_PASSCODE", "admin-secret");
    stubCloudEnv();

    const response = await GET(new NextRequest("http://localhost/api/entries"));

    expect(response.status).toBe(401);
  });

  it("returns latest entries with an admin session", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_PASSCODE", "admin-secret");
    stubCloudEnv();
    const fetchMock = stubSupabaseFetch();

    const response = await GET(adminRequest("http://localhost/api/entries"));
    const body = (await response.json()) as { entries: Entry[] };
    const listRequest = fetchMock.mock.calls.find(([url]) => String(url).includes("/entries?select="));

    expect(response.status).toBe(200);
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0]?.source).toBe("text");
    expect(String(listRequest?.[0])).toContain("limit=50");
  });

  it("rejects deleting entries without an admin session", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_PASSCODE", "admin-secret");
    stubCloudEnv();

    const response = await DELETE(new NextRequest(`http://localhost/api/entries?id=${uuid}`));

    expect(response.status).toBe(401);
  });

  it("deletes an entry with an admin session", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_PASSCODE", "admin-secret");
    stubCloudEnv();
    const fetchMock = stubSupabaseFetch();

    const response = await DELETE(adminRequest(`http://localhost/api/entries?id=${uuid}`));
    const deleteRequest = fetchMock.mock.calls.find(
      ([url, init]) => String(url).includes("/entries?id=eq.") && init?.method === "DELETE"
    );

    expect(response.status).toBe(200);
    expect(deleteRequest).toBeTruthy();
  });
});
