import { describe, expect, it } from "vitest";
import { APP_SCHEMA_VERSION, DEFAULT_SETTINGS, type Entry } from "../domain/types";
import { buildArsenalView, createAmmoKey } from "../lib/arsenal/ammo";
import { readAmmoStatuses, updateAmmoStatus, writeAmmoStatuses } from "../lib/arsenal/statusStore";

function entry(id: string, text: string, createdAt = "2026-04-25T00:00:00.000Z"): Entry {
  return {
    id,
    memberId: DEFAULT_SETTINGS.defaultMemberId,
    text,
    mediaIds: [],
    source: "text",
    visibility: "family",
    createdAt,
    updatedAt: createdAt,
    schemaVersion: APP_SCHEMA_VERSION
  };
}

function memoryStorage(): Storage {
  const data = new Map<string, string>();

  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    removeItem: (key: string) => {
      data.delete(key);
    },
    setItem: (key: string, value: string) => {
      data.set(key, value);
    }
  };
}

describe("arsenal ammo generation", () => {
  it("creates a stable ammo_key from kind, title, and source entries", () => {
    const first = createAmmoKey("アプリ改善", "使いやすさの候補", ["entry_b", "entry_a"]);
    const second = createAmmoKey("アプリ改善", " 使いやすさの候補 ", ["entry_a", "entry_b"]);
    const third = createAmmoKey("生活改善", "使いやすさの候補", ["entry_a", "entry_b"]);

    expect(first).toBe(second);
    expect(first).toMatch(/^ammo_/);
    expect(first).not.toBe(third);
  });

  it("keeps ammo candidates capped at five", () => {
    const view = buildArsenalView([
      entry("entry_1", "保存したあと本当に残ったのか分かりにくい"),
      entry("entry_2", "また冷蔵庫を見ながら買い物リストを作るのが面倒"),
      entry("entry_3", "保育園の書類で毎回迷う"),
      entry("entry_4", "旅行先を比較してあとで見る"),
      entry("entry_5", "アプリの削除確認が分かりにくい"),
      entry("entry_6", "家族への連絡がいつも抜ける")
    ]);

    expect(view.cards).toHaveLength(5);
    expect(view.cards.every((card) => card.status === "candidate")).toBe(true);
    expect(view.summary.entryCount).toBe(6);
    expect(view.summary.topThree.length).toBeLessThanOrEqual(3);
  });

  it("generates tentative copy prompts for ChatGPT, Codex, and family confirmation", () => {
    const view = buildArsenalView([entry("entry_1", "ボタンが多くて入力前に迷う")]);
    const card = view.cards[0];

    expect(card).toBeTruthy();
    expect(card?.chatGptPrompt).toContain("これはひとこと箱の改善候補です");
    expect(card?.chatGptPrompt).toContain("まだ決定事項ではありません");
    expect(card?.codexPrompt).toContain("v0.xxとして以下の候補を実装するか検討");
    expect(card?.familyQuestion).toContain("これ、もう少し楽にできたら助かる？");
    expect(card?.sourceText).toContain("ボタンが多くて入力前に迷う");
  });

  it("can apply selected, parked, and ignored statuses outside the generator", () => {
    const storage = memoryStorage();
    const view = buildArsenalView([entry("entry_1", "入力が反応したのか分からない")]);
    const card = view.cards[0]!;

    const selected = updateAmmoStatus({}, card, "selected", new Date("2026-04-25T00:00:00.000Z"));
    writeAmmoStatuses(storage, selected);
    expect(readAmmoStatuses(storage)[card.ammoKey]?.status).toBe("selected");

    const parked = updateAmmoStatus(selected, card, "parked", new Date("2026-04-25T00:01:00.000Z"));
    writeAmmoStatuses(storage, parked);
    expect(readAmmoStatuses(storage)[card.ammoKey]?.status).toBe("parked");

    const ignored = updateAmmoStatus(parked, card, "ignored", new Date("2026-04-25T00:02:00.000Z"));
    writeAmmoStatuses(storage, ignored);
    expect(readAmmoStatuses(storage)[card.ammoKey]?.status).toBe("ignored");
  });

  it("normalizes old local statuses for v0.11", () => {
    const storage = memoryStorage();
    storage.setItem(
      "hitokoto-bako:ammo-statuses",
      JSON.stringify({
        ammo_entry_1: {
          id: "ammo_entry_1",
          sourceEntryIds: ["entry_1"],
          title: "old",
          status: "next",
          updatedAt: "2026-04-25T00:00:00.000Z"
        }
      })
    );

    expect(readAmmoStatuses(storage).ammo_entry_1?.status).toBe("selected");
  });
});
