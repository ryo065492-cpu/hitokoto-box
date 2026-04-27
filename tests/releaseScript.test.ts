import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const scriptPath = resolve(process.cwd(), "scripts", "release.ps1");

describe("release script", () => {
  it("exists and protects .env.local before git add", () => {
    expect(existsSync(scriptPath)).toBe(true);

    const source = readFileSync(scriptPath, "utf8");

    expect(source).toContain(".env.local");
    expect(source).toContain("npm.cmd");
    expect(source).toContain('"run", "lint"');
    expect(source).toContain('"run", "build"');
    expect(source).toContain('"run", "test"');
    expect(source).toContain('-FilePath "git" -Arguments @("add", ".")');
    expect(source).toContain('-FilePath "git" -Arguments @("commit", "-m", $Message)');
    expect(source).toContain('-FilePath "git" -Arguments @("push")');
    expect(source).toContain("PowerShell");
  });
});
