declare global {
  interface SpeechRecognitionResultLike {
    readonly isFinal: boolean;
    readonly 0: {
      readonly transcript: string;
    };
  }

  interface SpeechRecognitionEventLike extends Event {
    readonly resultIndex: number;
    readonly results: ArrayLike<SpeechRecognitionResultLike>;
  }

  interface SpeechRecognitionLike extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null;
    onerror: ((event: Event) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
  }

  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export {};
