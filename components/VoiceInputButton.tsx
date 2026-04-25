"use client";

import { useEffect, useRef, useState } from "react";

interface VoiceInputButtonProps {
  onFallbackRequested: () => void;
  onTranscript: (transcript: string) => void;
  onVoiceUsed: () => void;
}

const keyboardMicGuide = "この端末では、キーボードのマイク入力を使ってください。";

export default function VoiceInputButton({
  onFallbackRequested,
  onTranscript,
  onVoiceUsed
}: VoiceInputButtonProps) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [message, setMessage] = useState("声でも残せます。");

  useEffect(() => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!Recognition) {
      setMessage("キーボードのマイク入力も使えます。");
    }

    return () => {
      const recognition = recognitionRef.current;
      recognitionRef.current = null;

      if (recognition) {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.stop();
      }
    };
  }, []);

  const guideKeyboardMic = () => {
    onFallbackRequested();
    setIsListening(false);
    setMessage(keyboardMicGuide);
  };

  const startListening = () => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!Recognition) {
      guideKeyboardMic();
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "ja-JP";
    recognition.interimResults = true;
    recognition.continuous = false;

    let didFail = false;
    let finalTranscript = "";
    let interimTranscript = "";

    recognition.onresult = (event) => {
      interimTranscript = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0].transcript.trim();

        if (!transcript) {
          continue;
        }

        if (event.results[index].isFinal) {
          finalTranscript = `${finalTranscript} ${transcript}`.trim();
        } else {
          interimTranscript = `${interimTranscript} ${transcript}`.trim();
        }
      }
    };

    recognition.onerror = () => {
      didFail = true;
      guideKeyboardMic();
    };

    recognition.onend = () => {
      if (didFail) {
        recognitionRef.current = null;
        setIsListening(false);
        return;
      }

      const transcript = `${finalTranscript} ${interimTranscript}`.trim();

      if (transcript) {
        onTranscript(transcript);
        onVoiceUsed();
        setMessage("入りました。");
      } else {
        onFallbackRequested();
        setMessage("入りませんでした。キーボードのマイク入力も使えます。");
      }

      recognitionRef.current = null;
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
      setMessage("聞いています。");
    } catch {
      recognitionRef.current = null;
      guideKeyboardMic();
    }
  };

  const handleClick = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    startListening();
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={isListening}
        className="rounded-full border border-clay/20 bg-white/80 px-4 py-2 text-sm text-ink transition hover:border-clay/40"
      >
        {isListening ? "聞いています" : "声で入れる"}
      </button>
      <p className="text-xs leading-5 text-ink/55">{message}</p>
    </div>
  );
}
