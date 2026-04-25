import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

export type PasscodeScope = "admin";

export const COOKIE_BY_SCOPE: Record<PasscodeScope, string> = {
  admin: "hitokoto_admin_session"
};

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function toPasscodeScope(): PasscodeScope {
  return "admin";
}

export function expectedPasscode(): string | undefined {
  return process.env.ADMIN_PASSCODE?.trim() || undefined;
}

export function isLocalDevelopmentMode(): boolean {
  return process.env.NODE_ENV !== "production" && !process.env.VERCEL_ENV;
}

function sessionValue(passcode: string): string {
  return createHmac("sha256", passcode).update("hitokoto-bako:admin").digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function hasValidPasscodeSession(request: NextRequest): boolean {
  const expected = expectedPasscode();

  if (!expected) {
    return isLocalDevelopmentMode();
  }

  const cookieValue = request.cookies.get(COOKIE_BY_SCOPE.admin)?.value;

  if (!cookieValue) {
    return false;
  }

  return safeEqual(cookieValue, sessionValue(expected));
}

export function withPasscodeSessionCookie(
  response: NextResponse,
  passcode: string
): NextResponse {
  response.cookies.set(COOKIE_BY_SCOPE.admin, sessionValue(passcode), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/"
  });

  return response;
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ ok: false, message: "合い言葉が必要です" }, { status: 401 });
}

export function requirePasscodeSession(request: NextRequest): NextResponse | undefined {
  return hasValidPasscodeSession(request) ? undefined : unauthorizedResponse();
}
