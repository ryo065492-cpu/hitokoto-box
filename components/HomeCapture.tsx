"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { captureEntry } from "@/lib/services/appService";
import PhotoPicker from "@/components/PhotoPicker";
import SaveFeedback from "@/components/SaveFeedback";
import VoiceInputButton from "@/components/VoiceInputButton";

export default function HomeCapture() {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "success" | "media-warning" | "error"
  >("idle");
  const voiceUsedRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (saveState !== "success" && saveState !== "media-warning") {
      return;
    }

    const timeoutId = window.setTimeout(() => setSaveState("idle"), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [saveState]);

  const canSave = useMemo(() => text.trim().length > 0 || files.length > 0, [files.length, text]);

  return (
    <main className="space-y-5">
      <header className="space-y-2 pt-4">
        <p className="text-sm tracking-[0.2em] text-clay/80">ひとこと箱</p>
        <h1 className="text-4xl font-semibold tracking-tight">なんか残す？</h1>
        <div className="space-y-1 text-sm leading-7 text-ink/70">
          <p>きれいに書かなくて大丈夫です</p>
          <p>ひとこと、写真、ぼやき、違和感だけで OK</p>
        </div>
      </header>

      <form
        onSubmit={(event) => {
          event.preventDefault();

          if (!canSave) {
            return;
          }

          void (async () => {
            setSaveState("saving");

            try {
              const result = await captureEntry({
                text,
                files,
                usedVoiceInput: voiceUsedRef.current
              });
              setText("");
              setFiles([]);
              voiceUsedRef.current = false;
              setSaveState(
                result.mediaStatus === "failed" || result.mediaStatus === "partial"
                  ? "media-warning"
                  : "success"
              );
            } catch {
              setSaveState("error");
            }
          })();
        }}
        className="rounded-calm border border-white/70 bg-white/72 p-6 shadow-quiet"
      >
        <div className="space-y-5">
          <label className="block">
            <span className="sr-only">ひとこと入力</span>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={8}
              className="min-h-[250px] w-full resize-none rounded-[2rem] border border-mist bg-paper/70 px-5 py-5 text-base leading-8 outline-none transition focus:border-clay/40 focus:bg-white"
              placeholder={`また冷蔵庫見ながら買い物リスト作るの面倒だった\nこの画面、毎回見るのが少し邪魔\n会議後のメール、何を書けばいいか迷った`}
            />
            <p className="mt-2 text-xs leading-5 text-ink/50">
              iPhoneのキーボードのマイクでも入力できます。
            </p>
          </label>

          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start">
            <PhotoPicker files={files} onFilesChange={setFiles} disabled={saveState === "saving"} />
            <VoiceInputButton
              onFallbackRequested={() => {
                textareaRef.current?.focus();
              }}
              onTranscript={(transcript) => {
                setText((current) => (current ? `${current}\n${transcript}` : transcript));
              }}
              onVoiceUsed={() => {
                voiceUsedRef.current = true;
              }}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={!canSave || saveState === "saving"}
              className="rounded-full bg-clay px-6 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              保存する
            </button>

            <Link
              href="/review"
              className="text-sm text-ink/60 underline decoration-clay/30 underline-offset-4 transition hover:text-ink"
            >
              あとで見る
            </Link>
          </div>

          <SaveFeedback state={saveState} />
        </div>
      </form>

      <footer className="text-xs leading-5 text-ink/50">
        きれいに書かなくて大丈夫です。あとから静かに見返せます。
      </footer>
    </main>
  );
}
