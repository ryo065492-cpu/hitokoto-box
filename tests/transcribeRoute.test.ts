import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/transcribe/route";

function request(formData: FormData): NextRequest {
  return new NextRequest("http://localhost/api/transcribe", {
    method: "POST",
    body: formData
  });
}

function formWithAudio(file = new File(["voice"], "voice.m4a", { type: "audio/mp4" })) {
  const formData = new FormData();
  formData.append("audio", file);
  return formData;
}

describe("transcribe route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("rejects requests without audio", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");

    const response = await POST(request(new FormData()));
    const body = (await response.json()) as { ok: boolean; message: string };

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
  });

  it("returns a setup error when OPENAI_API_KEY is missing", async () => {
    const response = await POST(request(formWithAudio()));
    const body = (await response.json()) as { ok: boolean; message: string };

    expect(response.status).toBe(503);
    expect(body.ok).toBe(false);
    expect(body.message).toContain("音声入力");
  });

  it("sends audio to OpenAI and returns transcribed text", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = init?.body as FormData;

      expect(body.get("model")).toBe("gpt-4o-mini-transcribe");
      expect(body.get("language")).toBe("ja");
      expect(body.get("file")).toBeInstanceOf(File);

      return Response.json({ text: "洗剤がない" });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request(formWithAudio()));
    const body = (await response.json()) as { ok: boolean; text: string };

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, text: "洗剤がない" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/audio/transcriptions",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer test-key"
        }
      })
    );
  });
});
