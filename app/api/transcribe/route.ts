import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";

interface OpenAiTranscriptionResponse {
  text?: string;
}

function openAiApiKey(): string | undefined {
  return process.env.OPENAI_API_KEY?.trim() || undefined;
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ ok: false, message }, { status });
}

function safeAudioFileName(file: File): string {
  const name = file.name.trim();

  if (name) {
    return name;
  }

  if (file.type.includes("mp4")) {
    return "voice.m4a";
  }

  if (file.type.includes("ogg")) {
    return "voice.ogg";
  }

  return "voice.webm";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const apiKey = openAiApiKey();

  if (!apiKey) {
    return jsonError("音声入力の準備がまだできていません。", 503);
  }

  const formData = await request.formData().catch(() => undefined);
  const audio = formData?.get("audio");

  if (!(audio instanceof File) || audio.size === 0) {
    return jsonError("音声が見つかりませんでした。", 400);
  }

  if (audio.size > MAX_AUDIO_BYTES) {
    return jsonError("音声が少し長すぎました。", 413);
  }

  const openAiFormData = new FormData();
  openAiFormData.append("file", audio, safeAudioFileName(audio));
  openAiFormData.append("model", TRANSCRIPTION_MODEL);
  openAiFormData.append("language", "ja");
  openAiFormData.append("response_format", "json");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: openAiFormData
  }).catch(() => undefined);

  if (!response?.ok) {
    return jsonError("うまく文字にできませんでした。", 502);
  }

  const result = (await response.json().catch(() => ({}))) as OpenAiTranscriptionResponse;
  const text = result.text?.trim() ?? "";

  if (!text) {
    return jsonError("うまく文字にできませんでした。", 422);
  }

  return NextResponse.json({ ok: true, text });
}
