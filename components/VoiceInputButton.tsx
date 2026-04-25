"use client";

import { useEffect, useRef, useState } from "react";

interface VoiceInputButtonProps {
  onTranscript: (transcript: string) => void;
  onVoiceUsed: () => void;
}

export default function VoiceInputButton({
  onTranscript,
  onVoiceUsed
}: VoiceInputButtonProps) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [message, setMessage] = useState("対応ブラウザでは声で入れられます。");

  useEffect(() => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setIsSupported(Boolean(Recognition));

    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const toggleListening = () => {
    if (!isSupported) {
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!Recognition) {
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "ja-JP";
    recognition.interimResults = true;
    recognition.continuous = false;

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
      setMessage("うまく聞き取れなかったので、そのまま入力で大丈夫です。");
      setIsListening(false);
    };

    recognition.onend = () => {
      const transcript = `${finalTranscript} ${interimTranscript}`.trim();

      if (transcript) {
        onTranscript(transcript);
        onVoiceUsed();
        setMessage("声の内容を入力欄に入れました。");
      } else {
        setMessage("聞き取りを終えました。そのまま文字で続けても大丈夫です。");
      }

      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setMessage("聞き取り中です。終わるまで少し待ってください。");
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={toggleListening}
        disabled={!isSupported}
        className="rounded-full border border-clay/20 bg-white/80 px-4 py-2 text-sm text-ink transition hover:border-clay/40 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSupported ? (isListening ? "聞き取りを止める" : "声で入れる") : "声入力は非対応"}
      </button>
      <p className="text-xs leading-5 text-ink/55">
        {isSupported
          ? message
          : "このブラウザでは声入力が使えないので、そのまま文字で大丈夫です。"}
      </p>
    </div>
  );
}
