import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../domain/types";
import { resolveCaptureMemberId } from "../lib/services/appService";

function readSource(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("quiet UI contract", () => {
  it("does not expose quietMode as a settings toggle", () => {
    const settingsPage = readSource("../app/settings/page.tsx");

    expect(settingsPage).not.toContain("quietMode");
    expect(settingsPage).not.toContain("updateQuietMode");
    expect(settingsPage).not.toContain("MemberSwitcher");
  });

  it("keeps the home page open without a passcode gate", () => {
    const homePage = readSource("../app/page.tsx");

    expect(homePage).toContain("<HomeCapture />");
    expect(homePage).not.toContain("PasscodeGate");
  });

  it("keeps member selection and backend words out of the home capture UI", () => {
    const homeCapture = readSource("../components/HomeCapture.tsx");

    expect(homeCapture).not.toContain("VoiceInputButton");
    expect(homeCapture).not.toContain("声で入れる");
    expect(homeCapture).not.toContain("MemberSwitcher");
    expect(homeCapture).not.toContain("setDefaultMember");
    expect(homeCapture).not.toContain("memberId");
    expect(homeCapture).not.toContain("/settings");
    expect(homeCapture).not.toContain("合い言葉");
    expect(homeCapture).not.toContain("ログイン");
    expect(homeCapture).not.toContain("管理");
    expect(homeCapture).not.toContain("Supabase");
    expect(homeCapture).not.toContain("共有");
    expect(homeCapture).not.toContain("メンバー");
    expect(homeCapture).not.toContain("Codex");
    expect(homeCapture).not.toContain("Deep Research");
    expect(homeCapture).not.toContain("弾薬庫");
    expect(homeCapture).not.toContain("/arsenal");
    expect(homeCapture).not.toContain("改善材料パック");
  });

  it("does not show who wrote an entry in recent entries", () => {
    const recentEntries = readSource("../components/RecentEntries.tsx");

    expect(recentEntries).not.toContain("memberName");
    expect(recentEntries).not.toContain("memberId");
  });

  it("can resolve a capture member without user selection", () => {
    expect(resolveCaptureMemberId(undefined, DEFAULT_SETTINGS)).toBe(DEFAULT_SETTINGS.defaultMemberId);
    expect(resolveCaptureMemberId("legacy-member", DEFAULT_SETTINGS)).toBe("legacy-member");
  });

  it("keeps review themes scoped to the current week and capped at three", () => {
    const appService = readSource("../lib/services/appService.ts");

    expect(appService).toContain("activeRepository.listWeeklyInsights(weekStart)");
    expect(appService).toContain("activeRepository.listEntries({ limit: 3 })");
    expect(appService).toContain("weeklyInsights.slice(0, 3)");
  });

  it("keeps Codex copy actions out of weekly and review surfaces", () => {
    const weeklySummary = readSource("../components/WeeklySummary.tsx");
    const reviewPage = readSource("../app/review/page.tsx");

    expect(weeklySummary).not.toContain("Codex");
    expect(reviewPage).not.toContain("Codex");
  });

  it("keeps voice transcription implementation words out of rendered home copy", () => {
    const homeCapture = readSource("../components/HomeCapture.tsx");

    expect(homeCapture).not.toContain("OpenAI");
    expect(homeCapture).not.toContain("API");
    expect(homeCapture).not.toContain("token");
    expect(homeCapture).not.toContain("/api/transcribe");
    expect(homeCapture).not.toContain("MediaRecorder");
  });

  it("protects entries with the admin passcode gate and uses Japanese copy", () => {
    const entriesPage = readSource("../app/entries/page.tsx");

    expect(entriesPage).toContain('scope="admin"');
    expect(entriesPage).toContain("保存されたひとこと");
    expect(entriesPage).toContain("ここで最近の入力を確認できます。");
    expect(entriesPage).toContain("通常入力");
    expect(entriesPage).toContain("ショートカット");
    expect(entriesPage).toContain("共有シート");
  });

  it("keeps Codex copy actions in the developer surface", () => {
    const developerNotesList = readSource("../components/DeveloperNotesList.tsx");
    const developerPackPanel = readSource("../components/DeveloperPackPanel.tsx");
    const developerPage = readSource("../app/developer/page.tsx");

    expect(developerNotesList).toContain("Codex");
    expect(developerNotesList).toContain("note.codexPrompt");
    expect(developerPackPanel).toContain("改善材料パック");
    expect(developerPackPanel).toContain("ChatGPT用まとめをコピー");
    expect(developerPackPanel).toContain("Codex用改善指示をコピー");
    expect(developerPackPanel).toContain("家族内βレビューをコピー");
    expect(developerPage).toContain("DeveloperPackPanel");
  });

  it("protects viewing and management surfaces with the admin passcode gate", () => {
    expect(readSource("../app/review/page.tsx")).toContain('scope="admin"');
    expect(readSource("../app/weekly/page.tsx")).toContain('scope="admin"');
    expect(readSource("../app/entries/page.tsx")).toContain('scope="admin"');
    expect(readSource("../app/arsenal/page.tsx")).toContain('scope="admin"');
    expect(readSource("../app/developer/page.tsx")).toContain('scope="admin"');
    expect(readSource("../app/settings/page.tsx")).toContain('scope="admin"');
  });

  it("keeps the arsenal as an admin-only operation room", () => {
    const arsenalPage = readSource("../app/arsenal/page.tsx");
    const arsenalBoard = readSource("../components/ArsenalBoard.tsx");

    expect(arsenalPage).toContain("ArsenalBoard");
    expect(arsenalBoard).toContain("弾薬庫");
    expect(arsenalBoard).toContain("今日使える弾");
    expect(arsenalBoard).toContain("ChatGPTに相談する文面をコピー");
    expect(arsenalBoard).toContain("Codexに投げる指示をコピー");
    expect(arsenalBoard).toContain("家族に確認する一言をコピー");
    expect(arsenalBoard).toContain("/entries");
    expect(arsenalBoard).toContain("/review");
    expect(arsenalBoard).toContain("/developer");
    expect(arsenalBoard).toContain("/settings");
  });

  it("keeps passcode copy gentle and avoids login wording", () => {
    const passcodeGate = readSource("../components/PasscodeGate.tsx");

    expect(passcodeGate).toContain("合い言葉");
    expect(passcodeGate).not.toContain("ログイン");
  });
});
