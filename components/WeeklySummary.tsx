import Link from "next/link";
import CopyButton from "@/components/CopyButton";
import type { WeeklyInsight } from "@/domain/types";

interface WeeklySummaryProps {
  insights: WeeklyInsight[];
  suggestedTrial?: string;
  chatGptPrompt?: string;
  hasDeveloperDetails?: boolean;
  isLoading?: boolean;
}

export default function WeeklySummary({
  insights,
  suggestedTrial,
  chatGptPrompt,
  hasDeveloperDetails,
  isLoading = false
}: WeeklySummaryProps) {
  if (isLoading) {
    return (
      <section className="rounded-calm border border-white/60 bg-white/70 p-5 shadow-quiet">
        <p className="text-sm text-ink/55">今週の内容をまとめています。</p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-calm border border-white/60 bg-white/70 p-5 shadow-quiet">
        <h2 className="text-base font-semibold">今週よく出た困りごと</h2>
        {insights.length ? (
          <div className="mt-4 space-y-3">
            {insights.slice(0, 3).map((insight) => (
              <article
                key={insight.id}
                className="rounded-3xl border border-mist bg-paper/80 px-4 py-4"
              >
                <p className="text-sm font-medium">{insight.title}</p>
                <p className="mt-2 text-sm leading-6 text-ink/65">{insight.summary}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-ink/60">
            今週の繰り返しはまだ少なめです。少し記録がたまると、ここに最大 3 件だけ出ます。
          </p>
        )}
      </section>

      <section className="rounded-calm border border-white/60 bg-white/70 p-5 shadow-quiet">
        <h2 className="text-base font-semibold">1 つだけ試すなら</h2>
        <p className="mt-4 rounded-3xl border border-leaf/20 bg-leaf/10 px-4 py-4 text-sm leading-7">
          {suggestedTrial ?? "今週は無理に改善を決めなくて大丈夫です。次のひとことを待ちましょう。"}
        </p>
      </section>

      <section className="rounded-calm border border-white/60 bg-white/70 p-5 shadow-quiet">
        <h2 className="text-base font-semibold">相談や改善に回す</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {chatGptPrompt ? (
            <CopyButton text={chatGptPrompt} label="ChatGPT に相談する文面をコピー" />
          ) : null}
          {hasDeveloperDetails ? (
            <Link
              href="/developer"
              className="rounded-full border border-clay/20 bg-white/80 px-4 py-2 text-sm text-ink transition hover:border-clay/40"
            >
              詳しく見る
            </Link>
          ) : null}
        </div>
        {!chatGptPrompt && !hasDeveloperDetails ? (
          <p className="mt-3 text-sm text-ink/60">今週はまだ奥に回す候補が少なめです。</p>
        ) : null}
      </section>
    </div>
  );
}
