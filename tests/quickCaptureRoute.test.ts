import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/quick-capture/route";

const row = {
  id: "11111111-1111-4111-8111-111111111111",
  text: "また洗剤なくなってた",
  source: "text",
  created_at: "2026-04-25T00:00:00.000Z",
  updated_at: "2026-04-25T00:00:00.000Z"
};

function request(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/quick-capture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

function stubCloudEnv(): void {
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
  vi.stubEnv("QUICK_CAPTURE_TOKEN", "quick-token");
}

function stubSupabaseFetch(): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const urlString = String(url);

    if (urlString.includes("/entries?on_conflict=id")) {
      return new Response(JSON.stringify([row]), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (urlString.includes("/entries?select=")) {
      return new Response(JSON.stringify([row]), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
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

describe("quick capture route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("saves text when the token is correct", async () => {
    stubCloudEnv();
    const fetchMock = stubSupabaseFetch();

    const response = await POST(
      request({
        token: "quick-token",
        text: "また洗剤なくなってた",
        source: "ios_shortcut"
      })
    );
    const body = (await response.json()) as { ok: boolean; message: string };
    const savedRequest = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("/entries?on_conflict=id")
    );
    const savedBody = JSON.parse(String(savedRequest?.[1]?.body)) as { source: string; text: string };

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, message: "残しました" });
    expect(savedBody.text).toBe("また洗剤なくなってた");
    expect(savedBody.source).toBe("ios_shortcut");
  });

  it("rejects an invalid token", async () => {
    stubCloudEnv();
    const fetchMock = stubSupabaseFetch();

    const response = await POST(request({ token: "wrong", text: "残したい" }));

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a missing token", async () => {
    stubCloudEnv();
    const fetchMock = stubSupabaseFetch();

    const response = await POST(request({ text: "谿九＠縺溘＞" }));

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an empty text", async () => {
    stubCloudEnv();

    const response = await POST(request({ token: "quick-token", text: "   " }));

    expect(response.status).toBe(400);
  });
});
