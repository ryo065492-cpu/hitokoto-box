import { describe, expect, it } from "vitest";
import { APP_SCHEMA_VERSION, DEFAULT_SETTINGS, type Entry } from "../domain/types";
import { buildDeveloperPack } from "../lib/developer/developerPack";

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

describe("developer pack", () => {
  it("builds a ChatGPT summary from recent entries", () => {
    const pack = buildDeveloperPack(
      [
        entry("entry_1", "保存したあと本当に残ったのか分かりにくい"),
        entry("entry_2", "また冷蔵庫を見ながら買い物リストを作るのが面倒"),
        entry("entry_3", "会議後のメールが毎回重い")
      ],
      "v0.9"
    );

    expect(pack.chatGptSummary).toContain("プロダクト名：ひとこと箱");
    expect(pack.chatGptSummary).toContain("現在のバージョン：v0.9");
    expect(pack.chatGptSummary).toContain("直近50件のひとこと");
    expect(pack.chatGptSummary).toContain("アプリ改善っぽいもの");
    expect(pack.chatGptSummary).toContain("生活改善っぽいもの");
    expect(pack.chatGptSummary).toContain("保存したあと本当に残ったのか分かりにくい");
    expect(pack.appImprovementEntries).toHaveLength(1);
    expect(pack.lifeImprovementEntries).toHaveLength(1);
  });

  it("builds a Codex instruction with guardrails and tests", () => {
    const pack = buildDeveloperPack(
      [
        entry("entry_1", "ボタンが多くて入力前に迷う"),
        entry("entry_2", "保育園の書類で毎回迷う")
      ],
      "v0.9"
    );

    expect(pack.codexInstruction).toContain("実際の家族入力から見えた課題");
    expect(pack.codexInstruction).toContain("守るべき思想");
    expect(pack.codexInstruction).toContain("変更してはいけないこと");
    expect(pack.codexInstruction).toContain("受け入れ条件");
    expect(pack.codexInstruction).toContain("テスト項目");
    expect(pack.codexInstruction).toContain("ホーム画面は入れるだけのまま");
  });

  it("builds a family beta review with top candidates and new topics", () => {
    const pack = buildDeveloperPack(
      [
        entry("entry_1", "洗剤がまたなくなっていた"),
        entry("entry_2", "写真を残したあと確認しにくい"),
        entry("entry_3", "近所の工事の音が気になった")
      ],
      "v0.9"
    );

    expect(pack.familyBetaReview).toContain("入力件数：3件");
    expect(pack.familyBetaReview).toContain("次に試す改善候補トップ3");
    expect(pack.newTopics.join("\n")).toContain("近所の工事の音が気になった");
  });
});
