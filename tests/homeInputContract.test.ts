import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSource(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("home input contract", () => {
  it("does not show the old in-app voice button", () => {
    const homeCapture = readSource("../components/HomeCapture.tsx");

    expect(homeCapture).not.toContain("VoiceInputButton");
    expect(homeCapture).not.toContain("声で入れる");
    expect(homeCapture).not.toContain("キーボードのマイクで話してください");
  });

  it("marks the textarea as Japanese-friendly input", () => {
    const homeCapture = readSource("../components/HomeCapture.tsx");

    expect(homeCapture).toContain('lang="ja-JP"');
    expect(homeCapture).toContain('autoCapitalize="off"');
    expect(homeCapture).toContain('autoCorrect="off"');
    expect(homeCapture).toContain("spellCheck={false}");
    expect(homeCapture).toContain('inputMode="text"');
  });

  it("keeps the voice guidance as a short note near the input", () => {
    const homeCapture = readSource("../components/HomeCapture.tsx");

    expect(homeCapture).toContain("声で残したい時は、入力欄をタップしてキーボードのマイクを使えます。");
  });
});
