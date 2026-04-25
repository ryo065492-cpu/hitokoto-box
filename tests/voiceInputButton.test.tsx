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

class MockSpeechRecognition implements SpeechRecognitionLike {
  continuous = false;
  interimResults = false;
  lang = "";
  onresult: ((event: SpeechRecognitionEventLike) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn(() => {
    this.onend?.();
  });
  addEventListener(): void {
    return undefined;
  }
  dispatchEvent(): boolean {
    return true;
  }
  removeEventListener(): void {
    return undefined;
  }
}

let root: Root | null = null;
let latestRecognition: MockSpeechRecognition | null = null;

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

function clickButton(host: HTMLElement) {
  const button = host.querySelector("button");
  expect(button).not.toBeNull();

  act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  latestRecognition = null;
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("VoiceInputButton", () => {
  it("falls back to the keyboard mic guide when Web Speech API is unavailable", () => {
    vi.stubGlobal("SpeechRecognition", undefined);
    vi.stubGlobal("webkitSpeechRecognition", undefined);
    const onFallbackRequested = vi.fn();

    const host = renderVoiceInputButton({ onFallbackRequested });
    clickButton(host);

    expect(onFallbackRequested).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain("キーボードのマイク入力");
  });

  it("uses ja-JP speech recognition and puts recognized text into the input callback", () => {
    vi.stubGlobal(
      "SpeechRecognition",
      class extends MockSpeechRecognition {
        constructor() {
          super();
          latestRecognition = this;
        }
      }
    );
    vi.stubGlobal("webkitSpeechRecognition", undefined);
    const onTranscript = vi.fn();
    const onVoiceUsed = vi.fn();

    const host = renderVoiceInputButton({ onTranscript, onVoiceUsed });
    clickButton(host);

    expect(latestRecognition?.lang).toBe("ja-JP");
    expect(host.textContent).toContain("聞いています");

    act(() => {
      latestRecognition?.onresult?.({
        resultIndex: 0,
        results: [
          {
            isFinal: true,
            0: { transcript: " 洗剤がない " }
          }
        ]
      } as unknown as SpeechRecognitionEventLike);
      latestRecognition?.onend?.();
    });

    expect(onTranscript).toHaveBeenCalledWith("洗剤がない");
    expect(onVoiceUsed).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain("入りました");
  });

  it("keeps existing text by appending voice transcripts in HomeCapture", () => {
    const homeCapture = readFileSync(path.resolve(process.cwd(), "components/HomeCapture.tsx"), "utf8");

    expect(homeCapture).toContain("iPhoneのキーボードのマイクでも入力できます。");
    expect(homeCapture).toContain("textareaRef.current?.focus()");
    expect(homeCapture).toContain("current ? `${current}\\n${transcript}` : transcript");
  });
});
