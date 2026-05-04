import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../app/api/arsenal/route";
import type { ArsenalView } from "../lib/arsenal/ammo";

const now = "2026-04-25T00:00:00.000Z";

function adminCookie(passcode: string): string {
  const value = createHmac("sha256", passcode).update("hitokoto-bako:admin").digest("base64url");
  return `hitokoto_admin_session=${value}`;
}

function request(withAdmin = false): NextRequest {
  return new NextRequest("http://localhost/api/arsenal", {
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
  const rows = [
    "保存したあと本当に残ったのか分かりにくい",
    "また冷蔵庫を見ながら買い物リストを作るのが面倒",
    "保育園の書類で毎回迷う",
    "旅行先を比較してあとで見る",
    "アプリの削除確認が分かりにくい",
    "家族への連絡がいつも抜ける"
  ].map((text, index) => ({
    id: `${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}-1111-4111-8111-111111111111`,
    text,
    source: "text",
    created_at: now,
    updated_at: now
  }));

  const fetchMock = vi.fn(async (url: string | URL | Request) => {
    const urlString = String(url);

    if (urlString.includes("/entries?select=")) {
      return Response.json(rows);
    }

    if (urlString.includes("/attachments")) {
      return Response.json([]);
    }

    return Response.json([]);
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("arsenal route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("requires an admin session", async () => {
    stubCloudEnv();

    const response = await GET(request(false));

    expect(response.status).toBe(401);
  });

  it("returns up to five ammo candidates with tentative copy prompts", async () => {
    stubCloudEnv();
    const fetchMock = stubSupabaseFetch();

    const response = await GET(request(true));
    const body = (await response.json()) as { view: ArsenalView };
    const listRequest = fetchMock.mock.calls.find(([url]) => String(url).includes("/entries?select="));

    expect(response.status).toBe(200);
    expect(body.view.cards).toHaveLength(5);
    expect(body.view.cards[0]?.status).toBe("candidate");
    expect(body.view.cards[0]?.chatGptPrompt).toContain("まだ決定事項ではありません");
    expect(body.view.cards[0]?.codexPrompt).toContain("以下の候補を実装するか検討");
    expect(body.view.cards[0]?.familyQuestion).toContain("これ、もう少し楽にできたら助かる？");
    expect(String(listRequest?.[0])).toContain("limit=50");
  });
});
