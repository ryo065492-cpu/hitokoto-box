import { NextResponse, type NextRequest } from "next/server";
import {
  expectedPasscode,
  hasValidPasscodeSession,
  isLocalDevelopmentMode,
  withPasscodeSessionCookie
} from "@/lib/server/passcode";

export function GET(request: NextRequest): NextResponse {
  const configured = Boolean(expectedPasscode());
  const localDevelopmentMode = !configured && isLocalDevelopmentMode();

  return NextResponse.json({
    configured,
    localDevelopmentMode,
    message:
      !configured && !localDevelopmentMode
        ? "Admin passcode is not configured for this deployment."
        : undefined,
    authorized: hasValidPasscodeSession(request)
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json().catch(() => ({}))) as {
    passcode?: string;
  };
  const expected = expectedPasscode();

  if (!expected) {
    if (isLocalDevelopmentMode()) {
      return NextResponse.json({ authorized: true, configured: false, localDevelopmentMode: true });
    }

    return NextResponse.json(
      {
        authorized: false,
        configured: false,
        localDevelopmentMode: false,
        message: "Admin passcode is not configured for this deployment."
      },
      { status: 503 }
    );
  }

  if (body.passcode === expected) {
    return withPasscodeSessionCookie(
      NextResponse.json({ authorized: true, configured: true }),
      expected
    );
  }

  return NextResponse.json(
    { authorized: false, configured: true, message: "合い言葉が違うようです。" },
    { status: 401 }
  );
}
