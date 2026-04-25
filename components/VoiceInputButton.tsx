"use client";

import { useEffect, useRef, useState } from "react";

interface VoiceInputButtonProps {
  onFallbackRequested: () => void;
  onTranscript: (transcript: string) => void;
  onVoiceUsed: () => void;
}

type VoiceState = "idle" | "recording" | "transcribing";

const maxRecordingMs = 30_000;
const failureGuide = "うまく文字にできませんでした。キーボードのマイクも使えます。";
const mediaRecorderMimeTypes = [
  "audio/mp4",
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg"
];

function chooseAudioMimeType() {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return "";
  }

  return mediaRecorderMimeTypes.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? "";
}

function extensionForMimeType(mimeType: string) {
  if (mimeType.includes("mp4")) {
    return "m4a";
  }

  if (mimeType.includes("ogg")) {
    return "ogg";
  }

  if (mimeType.includes("wav")) {
    return "wav";
  }

  if (mimeType.includes("aac")) {
    return "aac";
  }

  return "webm";
}

export default function VoiceInputButton({
  onFallbackRequested,
  onTranscript,
  onVoiceUsed
}: VoiceInputButtonProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<number | null>(null);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [message, setMessage] = useState("声でも残せます。");

  const clearRecordingTimeout = () => {
    if (timeoutRef.current === null) {
      return;
    }

    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const failSoftly = () => {
    clearRecordingTimeout();
    const recorder = recorderRef.current;
    recorderRef.current = null;

    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onerror = null;
      recorder.onstop = null;

      if (recorder.state === "recording") {
        try {
          recorder.stop();
        } catch {
          // Some browsers throw if the recorder already failed internally.
        }
      }
    }

    stopStream();
    chunksRef.current = [];
    setVoiceState("idle");
    setMessage(failureGuide);
    onFallbackRequested();
  };

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMessage("キーボードのマイク入力も使えます。");
    }

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      const recorder = recorderRef.current;
      recorderRef.current = null;

      if (recorder && recorder.state === "recording") {
        recorder.onstop = null;
        recorder.ondataavailable = null;
        recorder.onerror = null;
        recorder.stop();
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      chunksRef.current = [];
    };
  }, []);

  const transcribeAudio = async (audioBlob: Blob, mimeType: string) => {
    if (audioBlob.size === 0) {
      failSoftly();
      return;
    }

    setVoiceState("transcribing");
    setMessage("文字にしています。");

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, `voice.${extensionForMimeType(mimeType)}`);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        text?: string;
      };
      const transcript = result.text?.trim() ?? "";

      if (!response.ok || !result.ok || !transcript) {
        failSoftly();
        return;
      }

      chunksRef.current = [];
      setVoiceState("idle");
      setMessage("入りました。");
      onTranscript(transcript);
      onVoiceUsed();
    } catch {
      failSoftly();
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;

    if (!recorder || recorder.state !== "recording") {
      return;
    }

    clearRecordingTimeout();
    recorder.stop();
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      failSoftly();
      return;
    }

    let stream: MediaStream | null = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = chooseAudioMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        failSoftly();
      };

      recorder.onstop = () => {
        clearRecordingTimeout();
        stopStream();
        recorderRef.current = null;

        const blobType = recorder.mimeType || mimeType || chunksRef.current[0]?.type || "audio/webm";
        const audioBlob = new Blob(chunksRef.current, { type: blobType });
        chunksRef.current = [];
        void transcribeAudio(audioBlob, blobType);
      };

      recorder.start();
      setVoiceState("recording");
      setMessage("録音中。もう一度押すと止まります。");
      timeoutRef.current = window.setTimeout(stopRecording, maxRecordingMs);
    } catch {
      stream?.getTracks().forEach((track) => track.stop());
      failSoftly();
    }
  };

  const handleClick = () => {
    if (voiceState === "recording") {
      stopRecording();
      return;
    }

    if (voiceState === "transcribing") {
      return;
    }

    void startRecording();
  };

  const buttonLabel =
    voiceState === "recording" ? "録音中" : voiceState === "transcribing" ? "文字にしています" : "声で入れる";

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={voiceState === "recording"}
        disabled={voiceState === "transcribing"}
        className="rounded-full border border-clay/20 bg-white/80 px-4 py-2 text-sm text-ink transition hover:border-clay/40 disabled:cursor-wait disabled:opacity-70"
      >
        {buttonLabel}
      </button>
      <p className="text-xs leading-5 text-ink/55">{message}</p>
    </div>
  );
}
