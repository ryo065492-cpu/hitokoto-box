"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CopyButton from "@/components/CopyButton";
import type { AmmoCard, AmmoItemStatus, AmmoStatus, ArsenalView } from "@/lib/arsenal/ammo";
import {
  readAmmoStatuses,
  toAmmoStatusMap,
  updateAmmoStatus,
  writeAmmoStatuses,
  type AmmoStatusMap
} from "@/lib/arsenal/statusStore";

const STATUS_LABELS: Record<AmmoStatus, string> = {
  candidate: "候補",
  selected: "次に使う",
  parked: "寝かせる",
  ignored: "無視する",
  done: "完了"
};

const OPERATION_STEPS = [
  "新しいひとことを見る",
  "気になる弾を1つ採用する",
  "ChatGPTに相談する",
  "Codexに投げる",
  "反映したら完了にする"
];

interface ArsenalBoardProps {
  view?: ArsenalView;
  isLoading?: boolean;
  error?: string;
  onReload: () => void;
}

function currentStatus(card: AmmoCard, statuses: AmmoStatusMap): AmmoStatus {
  return statuses[card.ammoKey]?.status ?? statuses[card.id]?.status ?? card.status;
}

function releaseMessageFor(card?: AmmoCard): string {
  if (!card) {
    return "Update hitokoto box";
  }

  const text = `${card.kind} ${card.title} ${card.sourceText}`;

  if (text.includes("画面") || text.includes("入力") || text.includes("保存") || text.includes("ボタン")) {
    return "Improve hitokoto app workflow";
  }

  if (text.includes("買い物") || text.includes("冷蔵庫") || text.includes("家事") || text.includes("献立")) {
    return "Improve family daily workflow";
  }

  if (text.includes("書類") || text.includes("予定") || text.includes("保育園") || text.includes("学校")) {
    return "Improve family operations";
  }

  return "Update hitokoto operation room";
}

function releaseCommandFor(card?: AmmoCard): string {
  return `powershell.exe -ExecutionPolicy Bypass -File .\\scripts\\release.ps1 "${releaseMessageFor(card)}"`;
}

function nextOperationText(selectedCount: number, candidateCount: number): string {
  if (selectedCount > 0) {
    return "採用中の弾があります。ChatGPTかCodexに渡せます。";
  }

  if (candidateCount > 0) {
    return "今日は、弾候補から1つだけ選べばOKです。";
  }

  return "今日は眺めるだけでOKです。新しいひとことが増えたらまた見ましょう。";
}

function StatusButton({
  children,
  onClick,
  tone = "quiet"
}: {
  children: string;
  onClick: () => void;
  tone?: "primary" | "quiet";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        tone === "primary"
          ? "rounded-full bg-clay px-4 py-2 text-sm text-white transition hover:bg-clay/90"
          : "rounded-full border border-clay/20 bg-white/75 px-4 py-2 text-sm text-ink/70 transition hover:border-clay/40 hover:text-ink"
      }
    >
      {children}
    </button>
  );
}

export default function ArsenalBoard({ view, isLoading = false, error = "", onReload }: ArsenalBoardProps) {
  const [statuses, setStatuses] = useState<AmmoStatusMap>({});
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const localStatuses = readAmmoStatuses(typeof window === "undefined" ? undefined : window.localStorage);
    setStatuses(localStatuses);

    void (async () => {
      try {
        const response = await fetch("/api/arsenal/statuses");

        if (!response.ok) {
          return;
        }

        const body = (await response.json().catch(() => ({}))) as { statuses?: AmmoItemStatus[] };
        const serverStatuses = toAmmoStatusMap(body.statuses ?? []);
        setStatuses(serverStatuses);
        writeAmmoStatuses(typeof window === "undefined" ? undefined : window.localStorage, serverStatuses);
      } catch {
        // localStorage remains a temporary fallback when the shared status API is unavailable.
      }
    })();
  }, []);

  const setCardStatus = (card: AmmoCard, status: AmmoStatus) => {
    const updatedAt = new Date();

    setStatuses((current) => {
      const next = updateAmmoStatus(current, card, status, updatedAt);
      writeAmmoStatuses(typeof window === "undefined" ? undefined : window.localStorage, next);
      return next;
    });

    setStatusMessage("");

    void (async () => {
      try {
        const response = await fetch("/api/arsenal/statuses", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            ammo_key: card.ammoKey,
            source_entry_ids: card.sourceEntryIds,
            title: card.title,
            status
          })
        });

        setStatusMessage(response.ok ? "更新しました" : "更新できませんでした");
      } catch {
        setStatusMessage("更新できませんでした");
      }
    })();
  };

  if (isLoading) {
    return (
      <section className="rounded-calm border border-white/60 bg-white/70 p-5 shadow-quiet">
        <p className="text-sm text-ink/60">運用司令室を読み込んでいます。</p>
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
        <p className="text-sm text-ink/60">まだ表示できる弾候補がありません。</p>
      </section>
    );
  }

  const selectedCards = view.cards.filter((card) => currentStatus(card, statuses) === "selected");
  const candidateCards = view.cards.filter((card) => currentStatus(card, statuses) === "candidate");
  const foldedCards = view.cards.filter((card) => ["parked", "ignored", "done"].includes(currentStatus(card, statuses)));
  const releaseCommand = releaseCommandFor(selectedCards[0]);

  return (
    <div className="space-y-6">
      <section className="rounded-calm border border-white/60 bg-white/70 p-5 shadow-quiet">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-medium text-clay">管理者向け</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">運用司令室</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-ink/70">
              集まったひとことから、次に使う弾を1つ選ぶ場所です。自動で決める画面ではなく、候補を見て人間が選ぶための司令室です。
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
            保存されたひとことを見る
          </Link>
          <Link className="rounded-full bg-paper px-4 py-2 text-ink/70 transition hover:text-ink" href="/developer">
            詳細な開発材料を見る
          </Link>
          <Link className="rounded-full bg-paper px-4 py-2 text-ink/70 transition hover:text-ink" href="/settings">
            データ管理
          </Link>
          <Link className="rounded-full bg-paper px-4 py-2 text-ink/70 transition hover:text-ink" href="/review">
            ざっくり振り返り
          </Link>
        </div>

        {statusMessage ? <p className="mt-4 text-sm text-ink/60">{statusMessage}</p> : null}
      </section>

      <section className="rounded-calm border border-white/60 bg-white/80 p-5 shadow-quiet">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium text-clay">今日の運用</p>
            <h2 className="mt-1 text-2xl font-semibold">{nextOperationText(selectedCards.length, candidateCards.length)}</h2>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-3xl bg-paper/85 p-4">
              <p className="text-xs text-ink/45">新しく入ったひとこと数</p>
              <p className="mt-1 text-2xl font-semibold">{view.summary.entryCount}</p>
            </div>
            <div className="rounded-3xl bg-paper/85 p-4">
              <p className="text-xs text-ink/45">未整理の弾候補数</p>
              <p className="mt-1 text-2xl font-semibold">{candidateCards.length}</p>
            </div>
            <div className="rounded-3xl bg-paper/85 p-4">
              <p className="text-xs text-ink/45">採用中の弾数</p>
              <p className="mt-1 text-2xl font-semibold">{selectedCards.length}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-mist bg-white/60 p-4">
          <h3 className="text-sm font-semibold">次にやること</h3>
          <ol className="mt-3 grid gap-2 text-sm leading-6 text-ink/70 md:grid-cols-5">
            {OPERATION_STEPS.map((step, index) => (
              <li key={step} className="rounded-2xl bg-paper/80 px-3 py-2">
                {index + 1}. {step}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="rounded-calm border border-white/60 bg-white/80 p-5 shadow-quiet">
        <h2 className="text-xl font-semibold">次に使う弾</h2>
        <p className="mt-2 text-sm leading-7 text-ink/65">
          採用した弾だけをここに置きます。まずはこの枠からChatGPTかCodexに渡せばOKです。
        </p>

        {selectedCards.length ? (
          <div className="mt-5 grid gap-4">
            {selectedCards.map((card) => (
              <article key={card.id} className="rounded-3xl border border-clay/20 bg-paper/90 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-medium text-clay">採用中 / {card.kind}</p>
                    <h3 className="mt-1 text-lg font-semibold">{card.title}</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusButton onClick={() => setCardStatus(card, "done")}>完了にする</StatusButton>
                    <StatusButton onClick={() => setCardStatus(card, "parked")}>寝かせる</StatusButton>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink/75">{card.sourceText}</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <CopyButton text={card.chatGptPrompt} label="ChatGPTに相談する文面をコピー" />
                  <CopyButton text={card.codexPrompt} label="Codexに投げる指示をコピー" />
                  <CopyButton text={card.familyQuestion} label="家族に聞く一言をコピー" />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm leading-7 text-ink/60">
            まだ採用した弾はありません。下の弾候補から「採用する」を選ぶと、ここに出ます。
          </p>
        )}
      </section>

      <section className="rounded-calm border border-white/60 bg-white/70 p-5 shadow-quiet">
        <h2 className="text-xl font-semibold">弾候補</h2>
        <p className="mt-2 text-sm leading-7 text-ink/65">
          自動で拾った候補です。使うかどうかは選べます。
        </p>

        {candidateCards.length ? (
          <div className="mt-5 grid gap-4">
            {candidateCards.map((card) => {
              const status = currentStatus(card, statuses);

              return (
                <article key={card.id} className="rounded-3xl border border-mist bg-paper/85 p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-medium text-clay">分類案：{card.kind}</p>
                      <h3 className="mt-1 text-lg font-semibold">{card.title}</h3>
                    </div>
                    <span className="w-fit rounded-full bg-white/80 px-3 py-1 text-xs text-ink/60">
                      状態：{STATUS_LABELS[status]}
                    </span>
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
                      <p className="text-xs text-ink/45">優先度案</p>
                      <p className="mt-1">{card.priority}</p>
                    </div>
                    <div>
                      <p className="text-xs text-ink/45">次の一手案</p>
                      <p className="mt-1">{card.nextStep}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <StatusButton tone="primary" onClick={() => setCardStatus(card, "selected")}>
                      採用する
                    </StatusButton>
                    <StatusButton onClick={() => setCardStatus(card, "parked")}>寝かせる</StatusButton>
                    <StatusButton onClick={() => setCardStatus(card, "ignored")}>無視する</StatusButton>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3 opacity-80">
                    <CopyButton text={card.chatGptPrompt} label="相談文をコピー" />
                    <CopyButton text={card.codexPrompt} label="改善指示をコピー" />
                    <CopyButton text={card.familyQuestion} label="確認の一言をコピー" />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="mt-5 text-sm leading-7 text-ink/60">
            表示中の弾候補はありません。寝かせたものや無視したものは下の折りたたみに残ります。
          </p>
        )}

        {foldedCards.length ? (
          <details className="mt-5 rounded-3xl border border-mist bg-white/60 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-ink/75">
              寝かせたもの・無視したもの・完了したもの
            </summary>
            <div className="mt-4 space-y-3">
              {foldedCards.map((card) => {
                const status = currentStatus(card, statuses);

                return (
                  <article key={card.id} className="rounded-2xl bg-paper/80 p-4 text-sm">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-xs text-ink/50">状態：{STATUS_LABELS[status]}</p>
                        <p className="mt-1 font-medium">{card.title}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusButton onClick={() => setCardStatus(card, "selected")}>採用する</StatusButton>
                        <StatusButton onClick={() => setCardStatus(card, "candidate")}>候補に戻す</StatusButton>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </details>
        ) : null}
      </section>

      <section className="rounded-calm border border-white/60 bg-white/70 p-5 shadow-quiet">
        <h2 className="text-xl font-semibold">今週の運用メモ</h2>
        <p className="mt-2 text-sm leading-7 text-ink/65">
          今週はこのあたりが少し出ています。断定ではなく、見るための手がかりです。
        </p>
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
            <h3 className="text-sm font-semibold">次に使うなら候補はこのあたりです</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/70">
              {view.summary.topThree.length ? (
                view.summary.topThree.map((item) => <li key={item}>- {item}</li>)
              ) : (
                <li>- もう少し入力が集まってから選ぶ</li>
              )}
            </ul>
          </div>

          <div className="rounded-3xl border border-mist bg-paper/80 p-4">
            <h3 className="text-sm font-semibold">今は触らなくてよさそうなもの</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/70">
              {view.summary.doNotDo.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-calm border border-white/60 bg-white/70 p-5 shadow-quiet">
        <h2 className="text-xl font-semibold">更新作業</h2>
        <p className="mt-2 text-sm leading-7 text-ink/65">
          実装と確認が終わったら、このコマンドで release.ps1 を実行できます。メッセージは採用中の弾から、壊れにくい英語に寄せています。
        </p>
        <div className="mt-4 rounded-3xl border border-mist bg-paper/90 p-4">
          <code className="block overflow-x-auto whitespace-pre text-sm text-ink/75">{releaseCommand}</code>
        </div>
        <div className="mt-4">
          <CopyButton text={releaseCommand} label="更新コマンドをコピー" />
        </div>
      </section>
    </div>
  );
}
