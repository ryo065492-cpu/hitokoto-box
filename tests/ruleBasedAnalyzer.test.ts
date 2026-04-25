import { describe, expect, it } from "vitest";
import { RuleBasedAnalyzer } from "../lib/analyzer/ruleBasedAnalyzer";
import type { Entry } from "../domain/types";

function buildEntry(text: string, createdAt = new Date().toISOString()): Entry {
  return {
    id: `entry-${text}`,
    memberId: "ryo",
    text,
    mediaIds: [],
    source: "text",
    visibility: "family",
    createdAt,
    updatedAt: createdAt,
    schemaVersion: 1
  };
}

describe("RuleBasedAnalyzer", () => {
  it("adds shopping and habit related tags when matching repeated shopping pain", () => {
    const analyzer = new RuleBasedAnalyzer();
    const result = analyzer.analyzeEntry(buildEntry("また冷蔵庫見ながら買い物リスト作るの面倒だった"));
    const categories = result.tags.map((tag) => tag.category);

    expect(categories).toContain("shopping");
    expect(categories).toContain("housework");
    expect(categories).toContain("habit");
    expect(categories).toContain("automation_candidate");
  });

  it("creates a developer note for app feedback text", () => {
    const analyzer = new RuleBasedAnalyzer();
    const result = analyzer.analyzeEntry(
      buildEntry("保存したあと、本当に残ったのか分からなくて不安")
    );

    expect(result.tags.map((tag) => tag.category)).toContain("app_feedback");
    expect(result.developerNotes).toHaveLength(1);
    expect(result.developerNotes[0]?.interpretedIssue).toContain("保存完了");
  });

  it("generates at most three weekly insights", () => {
    const analyzer = new RuleBasedAnalyzer();
    const entries = [
      buildEntry("また冷蔵庫見ながら買い物リスト作るの面倒だった"),
      buildEntry("スーパー行く前に献立考えるの毎回つらい"),
      buildEntry("保育園の書類、何を書けばいいか毎回迷う"),
      buildEntry("会議後のメールがめんどい"),
      buildEntry("Excelの数字を見て何を報告すればいいか迷った")
    ];

    const insights = analyzer.generateWeeklyInsights(entries);

    expect(insights.length).toBeLessThanOrEqual(3);
  });

  it("ignores old entries when generating weekly insights", () => {
    const analyzer = new RuleBasedAnalyzer();
    const oldDate = "2000-01-01T00:00:00.000Z";
    const insights = analyzer.generateWeeklyInsights([
      buildEntry("また冷蔵庫見ながら買い物リスト作るの面倒だった", oldDate),
      buildEntry("スーパー行く前に献立考えるの毎回つらい", oldDate)
    ]);

    expect(insights).toHaveLength(0);
  });
});
