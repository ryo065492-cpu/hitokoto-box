import { afterEach, describe, expect, it, vi } from "vitest";
import { APP_SCHEMA_VERSION, DEFAULT_SETTINGS, type Entry } from "../domain/types";
import { ServerSupabaseRepository } from "../lib/server/serverRepository";

const uuid = "11111111-1111-4111-8111-111111111111";
const now = "2026-04-25T00:00:00.000Z";

function createEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: `entry_${uuid}`,
    memberId: DEFAULT_SETTINGS.defaultMemberId,
    text: "また冷蔵庫を見ながら買い物リストを作るのが面倒だった",
    mediaIds: [],
    source: "text",
    visibility: "family",
    createdAt: now,
    updatedAt: now,
    schemaVersion: APP_SCHEMA_VERSION,
    ...overrides
  };
}

describe("ServerSupabaseRepository", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saves entry text through the server-side Supabase REST endpoint", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), init });

      return new Response(
        JSON.stringify([
          {
            id: uuid,
            text: createEntry().text,
            source: "text",
            created_at: now,
            updated_at: now
          }
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    const repository = new ServerSupabaseRepository({
      url: "https://example.supabase.co",
      serviceRoleKey: "service-role-key"
    });
    const saved = await repository.createEntry(createEntry());
    const body = JSON.parse(String(requests[0]?.init?.body)) as { id: string; text: string };
    const headers = requests[0]?.init?.headers as Record<string, string>;

    expect(requests[0]?.url).toBe("https://example.supabase.co/rest/v1/entries?on_conflict=id");
    expect(headers.Authorization).toBe("Bearer service-role-key");
    expect(body).toMatchObject({
      id: uuid,
      text: createEntry().text
    });
    expect(saved.text).toBe(createEntry().text);
  });
});
