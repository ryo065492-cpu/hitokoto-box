// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import path from "node:path";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import VoiceInputButton from "../components/VoiceInputButton";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
(globalThis as typeof globalThis & { React?: typeof React }).React = React;

class MockMediaRecorder {
  static isTypeSupported = vi.fn((mimeType: string) => mimeType === "audio/mp4");

  readonly mimeType: string;
  state: RecordingState = "inactive";
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onstop: ((event: Event) => void) | null = null;
  start = vi.fn(() => {
    this.state = "recording";
  });
  stop = vi.fn(() => {
    if (this.state === "inactive") {
      return;
    }

    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["voice"], { type: this.mimeType }) } as BlobEvent);
    this.onstop?.(new Event("stop"));
  });

  constructor(_stream: MediaStream, options?: MediaRecorderOptions) {
    this.mimeType = options?.mimeType ?? "audio/webm";
    latestRecorder = this;
  }
}

let root: Root | null = null;
let latestRecorder: MockMediaRecorder | null = null;

function mockMediaRecorder() {
  const trackStop = vi.fn();
  const stream = {
    getTracks: () => [{ stop: trackStop }]
  } as unknown as MediaStream;
  const getUserMedia = vi.fn(async () => stream);

  vi.stubGlobal("MediaRecorder", MockMediaRecorder);
  Object.defineProperty(window.navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia }
  });

  return { getUserMedia, trackStop };
}

function renderVoiceInputButton(props: {
  onFallbackRequested?: () => void;
  onTranscript?: (transcript: string) => void;
  onVoiceUsed?: () => void;
}) {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);

  act(() => {
    root?.render(
      <VoiceInputButton
        onFallbackRequested={props.onFallbackRequested ?? vi.fn()}
        onTranscript={props.onTranscript ?? vi.fn()}
        onVoiceUsed={props.onVoiceUsed ?? vi.fn()}
      />
    );
  });

  return host;
}

async function clickButton(host: HTMLElement) {
  const button = host.querySelector("button");
  expect(button).not.toBeNull();

  await act(async () => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await Promise.resolve();
  });
}

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  latestRecorder = null;
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("VoiceInputButton", () => {
  it("moves into recording state when recording starts", async () => {
    const { getUserMedia } = mockMediaRecorder();
    const host = renderVoiceInputButton({});

    await clickButton(host);

    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(latestRecorder?.start).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain("録音中");
    expect(host.textContent).toContain("もう一度押すと止まります");
  });

  it("sends the recorded audio to /api/transcribe after stopping", async () => {
    mockMediaRecorder();
    const fetchMock = vi.fn(async () =>
      Response.json({
        ok: true,
        text: "洗剤がない"
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    const host = renderVoiceInputButton({});

    await clickButton(host);
    await clickButton(host);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/transcribe");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "POST" });
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBeInstanceOf(FormData);
  });

  it("puts successful transcription text into the input callback", async () => {
    mockMediaRecorder();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          ok: true,
          text: "洗剤がない"
        })
      )
    );
    const onTranscript = vi.fn();
    const onVoiceUsed = vi.fn();
    const host = renderVoiceInputButton({ onTranscript, onVoiceUsed });

    await clickButton(host);
    await clickButton(host);

    expect(onTranscript).toHaveBeenCalledWith("洗剤がない");
    expect(onVoiceUsed).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain("入りました");
    expect(host.textContent).toContain("声で入れる");
  });

  it("keeps existing text by appending voice transcripts in HomeCapture", () => {
    const homeCapture = readFileSync(path.resolve(process.cwd(), "components/HomeCapture.tsx"), "utf8");

    expect(homeCapture).toContain("current ? `${current}\\n${transcript}` : transcript");
  });

  it("shows a short failure guide when transcription fails", async () => {
    mockMediaRecorder();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            ok: false,
            message: "failed"
          },
          { status: 502 }
        )
      )
    );
    const onFallbackRequested = vi.fn();
    const onTranscript = vi.fn();
    const host = renderVoiceInputButton({ onFallbackRequested, onTranscript });

    await clickButton(host);
    await clickButton(host);

    expect(onTranscript).not.toHaveBeenCalled();
    expect(onFallbackRequested).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain("うまく文字にできませんでした");
    expect(host.textContent).toContain("声で入れる");
  });

  it("falls back to the keyboard mic when MediaRecorder is unavailable", async () => {
    vi.stubGlobal("MediaRecorder", undefined);
    Object.defineProperty(window.navigator, "mediaDevices", {
      configurable: true,
      value: undefined
    });
    const onFallbackRequested = vi.fn();
    const host = renderVoiceInputButton({ onFallbackRequested });

    await clickButton(host);

    expect(onFallbackRequested).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain("キーボードのマイク");
  });
});
