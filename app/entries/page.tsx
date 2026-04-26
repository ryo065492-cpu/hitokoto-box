"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import PasscodeGate from "@/components/PasscodeGate";
import type { Entry, EntrySource } from "@/domain/types";
import { formatDateTime } from "@/lib/dates/week";

function sourceLabel(source: EntrySource | string | undefined): string {
  switch (source) {
    case "text":
      return "通常入力";
    case "ios_shortcut":
      return "ショートカット";
    case "ios_share_sheet":
      return "共有シート";
    case "photo":
      return "写真";
    case "mixed":
      return "入力と写真";
    case "voice":
      return "音声";
    default:
      return "不明";
  }
}

function EntriesContent() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/entries?limit=50");
      const body = (await response.json().catch(() => ({}))) as { entries?: Entry[] };

      if (!response.ok) {
        setMessage("読み込めませんでした。");
        return;
      }

      setEntries(body.entries ?? []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const deleteEntry = async (entry: Entry) => {
    if (!window.confirm("このひとことを削除しますか？")) {
      return;
    }

    const response = await fetch(`/api/entries?id=${encodeURIComponent(entry.id)}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      setMessage("削除できませんでした。");
      return;
    }

    setEntries((current) => current.filter((item) => item.id !== entry.id));
    setMessage("削除しました。");
  };

  const deleteTestData = async () => {
    if (!window.confirm("本文に「テスト」または「あとで消してOK」を含むひとことを削除しますか？")) {
      return;
    }

    const response = await fetch("/api/entries/delete-test-data", {
      method: "POST"
    });
    const body = (await response.json().catch(() => ({}))) as { deletedCount?: number };

    if (!response.ok) {
      setMessage("テストデータを削除できませんでした。");
      return;
    }

    setMessage(`${body.deletedCount ?? 0}件削除しました。`);
    await loadEntries();
  };

  return (
    <main className="space-y-6">
      <header className="space-y-3 pt-2">
        <Link href="/review" className="text-sm text-ink/60 transition hover:text-ink">
          あとで見るへ戻る
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">保存されたひとこと</h1>
          <p className="mt-2 text-sm leading-7 text-ink/70">
            ここで最近の入力を確認できます。
          </p>
        </div>
      </header>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void loadEntries()}
          className="rounded-full border border-clay/20 bg-white/80 px-4 py-2 text-sm text-ink transition hover:border-clay/40"
        >
          更新する
        </button>
        <button
          type="button"
          onClick={() => void deleteTestData()}
          className="rounded-full border border-clay/20 bg-white/70 px-4 py-2 text-sm text-ink/70 transition hover:border-clay/40 hover:text-ink"
        >
          テストデータを削除
        </button>
      </div>

      {message ? <p className="text-sm text-ink/60">{message}</p> : null}

      <section className="rounded-calm border border-white/60 bg-white/70 p-5 shadow-quiet">
        {isLoading ? (
          <p className="text-sm text-ink/55">読み込み中です。</p>
        ) : entries.length ? (
          <div className="space-y-3">
            {entries.map((entry) => (
              <article
                key={entry.id}
                className="rounded-3xl border border-mist bg-paper/80 px-4 py-4"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-ink/55">
                  <time dateTime={entry.createdAt}>{formatDateTime(entry.createdAt)}</time>
                  <span>・</span>
                  <span>{sourceLabel(entry.source)}</span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{entry.text}</p>
                <button
                  type="button"
                  onClick={() => void deleteEntry(entry)}
                  className="mt-4 text-xs text-ink/50 underline decoration-clay/30 underline-offset-4 transition hover:text-ink"
                >
                  このひとことを削除
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-6 text-ink/60">まだ保存されたひとことはありません。</p>
        )}
      </section>
    </main>
  );
}

export default function EntriesPage() {
  return (
    <PasscodeGate scope="admin">
      <EntriesContent />
    </PasscodeGate>
  );
}
