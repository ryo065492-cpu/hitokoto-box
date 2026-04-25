"use client";

import Link from "next/link";
import { useState } from "react";
import PasscodeGate from "@/components/PasscodeGate";
import { downloadJson, exportRepositoryToJson, importJsonFile } from "@/lib/export/exportImport";
import { activeRepository } from "@/lib/storage/activeRepository";
import {
  clearAllData,
  rebuildDerivedData
} from "@/lib/services/appService";

export default function SettingsPage() {
  const [message, setMessage] = useState<string>("");
  const [isBusy, setIsBusy] = useState(false);

  const runAction = async (action: () => Promise<void>) => {
    setIsBusy(true);
    setMessage("");

    try {
      await action();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "うまく処理できませんでした。少し置いてからお試しください。"
      );
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <PasscodeGate scope="admin">
      <main className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-ink/60 transition hover:text-ink">
          戻る
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">データ管理</h1>
        <p className="mt-2 text-sm leading-7 text-ink/70">
          ひとことはこのブラウザ内に保存されます。必要なときだけ書き出しや復元をします。
        </p>
      </div>

      <section className="rounded-calm border border-white/60 bg-white/70 p-5 shadow-quiet">
        <h2 className="text-base font-semibold">データ</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => {
              void runAction(async () => {
                const json = await exportRepositoryToJson(activeRepository);
                downloadJson(
                  `hitokoto-bako-export-${new Date().toISOString().slice(0, 10)}.json`,
                  json
                );
                setMessage("JSON を書き出しました。");
              });
            }}
            className="rounded-3xl border border-clay/20 bg-paper px-4 py-3 text-left text-sm transition hover:border-clay/40 disabled:opacity-50"
          >
            JSON をエクスポート
          </button>

          <label className="cursor-pointer rounded-3xl border border-clay/20 bg-paper px-4 py-3 text-left text-sm transition hover:border-clay/40">
            JSON をインポート
            <input
              type="file"
              accept="application/json"
              className="hidden"
              disabled={isBusy}
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (!file) {
                  return;
                }

                void runAction(async () => {
                  await importJsonFile(activeRepository, file);
                  await rebuildDerivedData();
                  setMessage("JSON を読み込みました。");
                });

                event.target.value = "";
              }}
            />
          </label>

          <button
            type="button"
            disabled={isBusy}
            onClick={() => {
              void runAction(async () => {
                const shouldContinue = window.confirm("すべてのデータを削除します。よろしいですか？");

                if (!shouldContinue) {
                  return;
                }

                await clearAllData();
                setMessage("全データを削除しました。");
              });
            }}
            className="rounded-3xl border border-rose-300/60 bg-rose-50 px-4 py-3 text-left text-sm text-rose-800 transition hover:border-rose-400 disabled:opacity-50"
          >
            全データ削除
          </button>
        </div>

        <p className="mt-4 text-sm leading-6 text-ink/65">
          cloud mode では Next.js API 経由で本文を保存します。画像 Blob の同期とメンバー管理は v0.4 ではありません。
        </p>
        {message ? <p className="mt-3 text-sm text-clay">{message}</p> : null}
      </section>

      <section className="rounded-calm border border-white/60 bg-white/70 p-5 shadow-quiet">
        <h2 className="text-base font-semibold">バージョン</h2>
        <p className="mt-3 text-sm leading-6 text-ink/65">v0.5.0</p>
      </section>

      <details className="rounded-calm border border-white/60 bg-white/60 p-4 text-sm text-ink/60 shadow-quiet">
        <summary className="cursor-pointer list-none font-medium text-ink/70">
          補助的な画面
        </summary>
        <div className="mt-3">
          <Link href="/developer" className="transition hover:text-ink">
            開発者向けを見る
          </Link>
        </div>
      </details>
      </main>
    </PasscodeGate>
  );
}
