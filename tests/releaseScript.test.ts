import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const scriptPath = resolve(process.cwd(), "scripts", "release.ps1");

describe("release script", () => {
  it("exists and protects .env.local before git add", () => {
    expect(existsSync(scriptPath)).toBe(true);

    const source = readFileSync(scriptPath, "utf8");

    expect(source).toContain(".env.local");
    expect(source).toContain("npm run lint");
    expect(source).toContain("npm run build");
    expect(source).toContain("npm run test");
    expect(source).toContain("git add .");
    expect(source).toContain("git commit");
    expect(source).toContain("git push");
  });
});
