import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "../app/api/passcode/route";

function request(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(url, init);
}

describe("passcode route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows local development when the admin passcode is not configured", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ADMIN_PASSCODE", "");
    vi.stubEnv("VERCEL_ENV", "");

    const response = GET(request("http://localhost/api/passcode"));
    const body = (await response.json()) as { authorized: boolean; localDevelopmentMode: boolean };

    expect(body.authorized).toBe(true);
    expect(body.localDevelopmentMode).toBe(true);
  });

  it("blocks production deployments when the admin passcode is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_PASSCODE", "");
    vi.stubEnv("VERCEL_ENV", "production");

    const getResponse = GET(request("http://localhost/api/passcode"));
    const getBody = (await getResponse.json()) as { authorized: boolean; localDevelopmentMode: boolean };

    const postResponse = await POST(
      request("http://localhost/api/passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: "anything" })
      })
    );
    const postBody = (await postResponse.json()) as { authorized: boolean };

    expect(getBody.authorized).toBe(false);
    expect(getBody.localDevelopmentMode).toBe(false);
    expect(postResponse.status).toBe(503);
    expect(postBody.authorized).toBe(false);
  });

  it("sets an admin HttpOnly session cookie when the admin passcode is correct", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_PASSCODE", "admin-secret");

    const response = await POST(
      request("http://localhost/api/passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: "admin-secret" })
      })
    );
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(200);
    expect(setCookie).toContain("hitokoto_admin_session=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=lax");
    expect(setCookie).toContain("Max-Age=2592000");
  });
});
