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

  it("keeps Codex copy actions in the developer surface", () => {
    const developerNotesList = readSource("../components/DeveloperNotesList.tsx");

    expect(developerNotesList).toContain("Codex");
    expect(developerNotesList).toContain("note.codexPrompt");
  });

  it("protects viewing and management surfaces with the admin passcode gate", () => {
    expect(readSource("../app/review/page.tsx")).toContain('scope="admin"');
    expect(readSource("../app/weekly/page.tsx")).toContain('scope="admin"');
    expect(readSource("../app/developer/page.tsx")).toContain('scope="admin"');
    expect(readSource("../app/settings/page.tsx")).toContain('scope="admin"');
  });

  it("keeps passcode copy gentle and avoids login wording", () => {
    const passcodeGate = readSource("../components/PasscodeGate.tsx");

    expect(passcodeGate).toContain("合い言葉");
    expect(passcodeGate).not.toContain("ログイン");
  });
});
