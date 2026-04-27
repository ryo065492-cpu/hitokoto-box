import { describe, expect, it } from "vitest";
import { APP_SCHEMA_VERSION, DEFAULT_SETTINGS, type Entry } from "../domain/types";
import { buildArsenalView } from "../lib/arsenal/ammo";

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

describe("arsenal ammo generation", () => {
  it("keeps usable ammo cards capped at five", () => {
    const view = buildArsenalView([
      entry("entry_1", "保存したあと本当に残ったのか分かりにくい"),
      entry("entry_2", "また冷蔵庫を見ながら買い物リストを作るのが面倒"),
      entry("entry_3", "保育園の書類で毎回迷う"),
      entry("entry_4", "旅行先を比較してあとで見る"),
      entry("entry_5", "アプリの削除確認が分かりにくい"),
      entry("entry_6", "家族への連絡がいつも抜ける")
    ]);

    expect(view.cards).toHaveLength(5);
    expect(view.summary.entryCount).toBe(6);
    expect(view.summary.topThree.length).toBeLessThanOrEqual(3);
  });

  it("generates copy prompts for ChatGPT, Codex, and family confirmation", () => {
    const view = buildArsenalView([
      entry("entry_1", "ボタンが多くて入力前に迷う")
    ]);
    const card = view.cards[0];

    expect(card).toBeTruthy();
    expect(card?.chatGptPrompt).toContain("これはひとこと箱の改善候補です");
    expect(card?.codexPrompt).toContain("v0.xxとして以下の改善を実装してください");
    expect(card?.familyQuestion).toContain("これ、もう少し楽にできたら助かる？");
    expect(card?.sourceText).toContain("ボタンが多くて入力前に迷う");
  });

  it("can apply saved local statuses by ammo id", () => {
    const view = buildArsenalView([entry("entry_1", "入力が反応したのか分からない")], {
      ammo_entry_1: "next"
    });

    expect(view.cards[0]?.status).toBe("next");
  });
});
