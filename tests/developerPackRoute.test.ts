import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../app/api/developer-pack/route";
import type { DeveloperPack } from "../lib/developer/developerPack";

const now = "2026-04-25T00:00:00.000Z";

function adminCookie(passcode: string): string {
  const value = createHmac("sha256", passcode).update("hitokoto-bako:admin").digest("base64url");
  return `hitokoto_admin_session=${value}`;
}

function request(withAdmin = false): NextRequest {
  return new NextRequest("http://localhost/api/developer-pack", {
    headers: withAdmin ? { cookie: adminCookie("admin-secret") } : undefined
  });
}

function stubCloudEnv(): void {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("ADMIN_PASSCODE", "admin-secret");
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
}

function stubSupabaseFetch(): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (url: string | URL | Request) => {
    const urlString = String(url);

    if (urlString.includes("/entries?select=")) {
      return Response.json([
        {
          id: "11111111-1111-4111-8111-111111111111",
          text: "保存したあと本当に残ったのか分かりにくい",
          source: "text",
          created_at: now,
          updated_at: now
        },
        {
          id: "22222222-2222-4222-8222-222222222222",
          text: "また冷蔵庫を見ながら買い物リストを作るのが面倒",
          source: "text",
          created_at: now,
          updated_at: now
        }
      ]);
    }

    if (urlString.includes("/attachments")) {
      return Response.json([]);
    }

    return Response.json([]);
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("developer pack route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("requires an admin session", async () => {
    stubCloudEnv();

    const response = await GET(request(false));

    expect(response.status).toBe(401);
  });

  it("generates copy-ready packs from the latest entries", async () => {
    stubCloudEnv();
    const fetchMock = stubSupabaseFetch();

    const response = await GET(request(true));
    const body = (await response.json()) as { pack: DeveloperPack };
    const listRequest = fetchMock.mock.calls.find(([url]) => String(url).includes("/entries?select="));

    expect(response.status).toBe(200);
    expect(body.pack.chatGptSummary).toContain("ChatGPTに相談するためのまとめ");
    expect(body.pack.codexInstruction).toContain("受け入れ条件");
    expect(body.pack.familyBetaReview).toContain("家族内βレビュー");
    expect(body.pack.appImprovementEntries).toHaveLength(1);
    expect(body.pack.lifeImprovementEntries).toHaveLength(1);
    expect(String(listRequest?.[0])).toContain("limit=50");
  });
});
