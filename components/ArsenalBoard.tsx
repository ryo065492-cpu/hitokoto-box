"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CopyButton from "@/components/CopyButton";
import type { AmmoCard, AmmoItemStatus, AmmoStatus, ArsenalView } from "@/lib/arsenal/ammo";

const STATUS_LABELS: Record<AmmoStatus, string> = {
  unused: "未使用",
  next: "次に使う",
  doing: "実行中",
  parked: "寝かせる",
  done: "完了"
};

const STATUS_OPTIONS: AmmoStatus[] = ["unused", "next", "doing", "parked", "done"];
const STORAGE_KEY = "hitokoto-bako:ammo-statuses";

interface ArsenalBoardProps {
  view?: ArsenalView;
  isLoading?: boolean;
  error?: string;
  onReload: () => void;
}

function readStatuses(): Record<string, AmmoItemStatus> {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as Record<string, AmmoItemStatus>;
  } catch {
    return {};
  }
}

function saveStatuses(statuses: Record<string, AmmoItemStatus>): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
}

export default function ArsenalBoard({ view, isLoading = false, error = "", onReload }: ArsenalBoardProps) {
  const [statuses, setStatuses] = useState<Record<string, AmmoItemStatus>>({});

  useEffect(() => {
    setStatuses(readStatuses());
  }, []);

  const updateStatus = (card: AmmoCard, status: AmmoStatus) => {
    setStatuses((current) => {
      const next = {
        ...current,
        [card.id]: {
          id: card.id,
          sourceEntryIds: card.sourceEntryIds,
          title: card.title,
          status,
          updatedAt: new Date().toISOString()
        }
      };
      saveStatuses(next);
      return next;
    });
  };

  if (isLoading) {
    return (
      <section className="rounded-calm border border-white/60 bg-white/70 p-5 shadow-quiet">
        <p className="text-sm text-ink/60">弾を並べています。</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-calm border border-white/60 bg-white/70 p-5 shadow-quiet">
        <p className="text-sm text-ink/60">{error}</p>
      </section>
    );
  }

  if (!view) {
    return (
      <section className="rounded-calm border border-white/60 bg-white/70 p-5 shadow-quiet">
        <p className="text-sm text-ink/60">まだ表示できる弾がありません。</p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-calm border border-white/60 bg-white/70 p-5 shadow-quiet">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-medium text-clay">運用司令室</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">弾薬庫</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-ink/70">
              集まったひとことを、改善に使える弾として整理します。家族の不満リストではなく、仕組みを少し楽にするための材料です。
            </p>
          </div>
          <button
            type="button"
            onClick={onReload}
            className="w-fit rounded-full border border-clay/20 bg-white/80 px-4 py-2 text-sm text-ink transition hover:border-clay/40"
          >
            更新する
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <Link className="rounded-full bg-paper px-4 py-2 text-ink/70 transition hover:text-ink" href="/entries">
            保存されたひとこと
          </Link>
          <Link className="rounded-full bg-paper px-4 py-2 text-ink/70 transition hover:text-ink" href="/review">
            ざっくり振り返り
          </Link>
          <Link className="rounded-full bg-paper px-4 py-2 text-ink/70 transition hover:text-ink" href="/developer">
            詳細な開発者向け材料
          </Link>
          <Link className="rounded-full bg-paper px-4 py-2 text-ink/70 transition hover:text-ink" href="/settings">
            データ管理
          </Link>
        </div>
      </section>

      <section className="rounded-calm border border-white/60 bg-white/70 p-5 shadow-quiet">
        <h2 className="text-xl font-semibold">今日使える弾</h2>
        <p className="mt-2 text-sm leading-7 text-ink/65">
          直近50件から、次の改善に使えそうなものを最大5件だけ出しています。
        </p>

        {view.cards.length ? (
          <div className="mt-5 grid gap-4">
            {view.cards.map((card) => {
              const status = statuses[card.id]?.status ?? card.status;

              return (
                <article key={card.id} className="rounded-3xl border border-mist bg-paper/85 p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-medium text-clay">{card.kind}</p>
                      <h3 className="mt-1 text-lg font-semibold">{card.title}</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-ink/60">
                      <span className="rounded-full bg-white/80 px-3 py-1">優先度：{card.priority}</span>
                      <label className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-1">
                        状態：
                        <select
                          value={status}
                          onChange={(event) => updateStatus(card, event.target.value as AmmoStatus)}
                          className="bg-transparent text-xs outline-none"
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {STATUS_LABELS[option]}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm leading-7 text-ink/75">
                    <div>
                      <p className="text-xs text-ink/45">元になったひとこと</p>
                      <p className="mt-1 whitespace-pre-wrap">{card.sourceText}</p>
                    </div>
                    <div>
                      <p className="text-xs text-ink/45">なぜ使えそうか</p>
                      <p className="mt-1">{card.reason}</p>
                    </div>
                    <div>
                      <p className="text-xs text-ink/45">次の一手</p>
                      <p className="mt-1">{card.nextStep}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <CopyButton text={card.chatGptPrompt} label="ChatGPTに相談する文面をコピー" />
                    <CopyButton text={card.codexPrompt} label="Codexに投げる指示をコピー" />
                    <CopyButton text={card.familyQuestion} label="家族に確認する一言をコピー" />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="mt-5 text-sm leading-7 text-ink/60">
            まだ弾にできるひとことがありません。数日入れてから見ると、ここが育ってきます。
          </p>
        )}
      </section>

      <section className="rounded-calm border border-white/60 bg-white/70 p-5 shadow-quiet">
        <h2 className="text-xl font-semibold">今週の弾薬まとめ</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-mist bg-paper/80 p-4 text-sm leading-7 text-ink/75">
            <p>入力件数：{view.summary.entryCount}件</p>
            <p>アプリ改善っぽいもの：{view.summary.appImprovementCount}件</p>
            <p>生活改善っぽいもの：{view.summary.lifeImprovementCount}件</p>
          </div>

          <div className="rounded-3xl border border-mist bg-paper/80 p-4">
            <h3 className="text-sm font-semibold">新しく出てきた話題</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/70">
              {view.summary.newTopics.map((topic) => (
                <li key={topic}>- {topic}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-mist bg-paper/80 p-4">
            <h3 className="text-sm font-semibold">次に使うならこれ</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/70">
              {view.summary.topThree.length ? (
                view.summary.topThree.map((item) => <li key={item}>- {item}</li>)
              ) : (
                <li>- もう少し入力が集まってから決める</li>
              )}
            </ul>
          </div>

          <div className="rounded-3xl border border-mist bg-paper/80 p-4">
            <h3 className="text-sm font-semibold">今はやらない方がいいこと</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/70">
              {view.summary.doNotDo.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
