"use client";

import { type ReactNode, useEffect, useState } from "react";

interface PasscodeGateProps {
  scope: "admin";
  children: ReactNode;
}

type GateState = "checking" | "open" | "closed";

const missingPasscodeMessage = "この公開環境では合い言葉がまだ設定されていません。";

export default function PasscodeGate({ children }: PasscodeGateProps) {
  const [gateState, setGateState] = useState<GateState>("checking");
  const [passcode, setPasscode] = useState("");
  const [message, setMessage] = useState("");
  const [configurationMessage, setConfigurationMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/passcode", { cache: "no-store" });
        const result = (await response.json()) as { authorized: boolean; message?: string };
        setConfigurationMessage(result.message ? missingPasscodeMessage : "");
        setGateState(result.authorized ? "open" : "closed");
      } catch {
        setMessage("箱を開けませんでした。少し置いてからもう一度お試しください。");
        setGateState("closed");
      }
    })();
  }, []);

  if (gateState === "checking") {
    return (
      <main className="rounded-calm border border-white/60 bg-white/70 p-6 shadow-quiet">
        <p className="text-sm text-ink/60">ひとこと箱を開いています。</p>
      </main>
    );
  }

  if (gateState === "open") {
    return children;
  }

  return (
    <main className="space-y-5 pt-10">
      <div className="space-y-2">
        <p className="text-sm tracking-[0.2em] text-clay/80">ひとこと箱</p>
        <h1 className="text-3xl font-semibold tracking-tight">奥の画面の合い言葉</h1>
        <p className="text-sm leading-7 text-ink/65">
          ここから先は、振り返りやデータ管理のための画面です。
        </p>
      </div>

      <form
        className="rounded-calm border border-white/70 bg-white/72 p-5 shadow-quiet"
        onSubmit={(event) => {
          event.preventDefault();

          void (async () => {
            setIsSubmitting(true);
            setMessage("");

            try {
              const response = await fetch("/api/passcode", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({ passcode })
              });

              if (!response.ok) {
                const result = (await response.json().catch(() => ({}))) as { message?: string };
                setMessage(result.message ? missingPasscodeMessage : "合い言葉が違うようです。");
                return;
              }

              setGateState("open");
              setPasscode("");
            } finally {
              setIsSubmitting(false);
            }
          })();
        }}
      >
        <label className="block">
          <span className="sr-only">合い言葉</span>
          <input
            type="password"
            value={passcode}
            onChange={(event) => setPasscode(event.target.value)}
            className="w-full rounded-3xl border border-mist bg-paper/70 px-4 py-3 text-base outline-none transition focus:border-clay/40 focus:bg-white"
            placeholder="合い言葉"
          />
        </label>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="submit"
            disabled={isSubmitting || !passcode}
            className="rounded-full bg-clay px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            開く
          </button>
          {message ? <p className="text-sm text-rose-700">{message}</p> : null}
        </div>

        {configurationMessage ? (
          <p className="mt-3 text-sm leading-6 text-rose-700">{configurationMessage}</p>
        ) : null}
      </form>
    </main>
  );
}
