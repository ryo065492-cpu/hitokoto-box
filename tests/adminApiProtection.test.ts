import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as getDeveloperPack } from "../app/api/developer-pack/route";
import { GET as getDeveloperNotes } from "../app/api/developer-notes/route";
import { GET as exportData } from "../app/api/export/route";
import { GET as getReview } from "../app/api/review/route";
import { GET as getWeekly } from "../app/api/weekly/route";

function request(url: string): NextRequest {
  return new NextRequest(url);
}

describe("admin API protection", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not expose developer notes without an admin session", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_PASSCODE", "admin-secret");

    const response = await getDeveloperNotes(request("http://localhost/api/developer-notes"));

    expect(response.status).toBe(401);
  });

  it("does not expose developer packs without an admin session", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_PASSCODE", "admin-secret");

    const response = await getDeveloperPack(request("http://localhost/api/developer-pack"));

    expect(response.status).toBe(401);
  });

  it("does not expose review data without an admin session", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_PASSCODE", "admin-secret");

    const response = await getReview(request("http://localhost/api/review"));

    expect(response.status).toBe(401);
  });

  it("does not expose weekly data without an admin session", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_PASSCODE", "admin-secret");

    const response = await getWeekly(request("http://localhost/api/weekly"));

    expect(response.status).toBe(401);
  });

  it("does not export data without an admin session", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_PASSCODE", "admin-secret");

    const response = await exportData(request("http://localhost/api/export"));

    expect(response.status).toBe(401);
  });
});
