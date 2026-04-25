"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PasscodeGate from "@/components/PasscodeGate";
import RecentEntries from "@/components/RecentEntries";
import type { ReviewOverview } from "@/lib/services/appService";
import { getReviewOverview } from "@/lib/services/appService";

function ReviewContent() {
  const [data, setData] = useState<ReviewOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const nextData = await getReviewOverview();
        setData(nextData);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-ink/60 transition hover:text-ink">
            戻る
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">あとで見る</h1>
          <p className="mt-2 text-sm leading-7 text-ink/70">
            普段は見なくて大丈夫です。少しだけ整えて振り返れます。
          </p>
        </div>

        <Link
          href="/weekly"
          className="rounded-full border border-clay/20 bg-white/70 px-4 py-2 text-sm text-clay shadow-quiet transition hover:border-clay/40"
        >
          週のまとめへ
        </Link>
      </div>

      <section className="rounded-calm border border-white/60 bg-white/70 p-5 shadow-quiet">
        <h2 className="text-sm font-semibold text-ink/80">今週よく出ているテーマ</h2>
        {isLoading ? (
          <p className="mt-3 text-sm text-ink/55">読み込み中です。</p>
        ) : data?.themes.length ? (
          <div className="mt-4 space-y-3">
            {data.themes.map((theme) => (
              <article
                key={theme.title}
                className="rounded-3xl border border-mist bg-paper/80 px-4 py-3"
              >
                <p className="text-sm font-medium">{theme.title}</p>
                <p className="mt-1 text-sm leading-6 text-ink/65">{theme.summary}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-ink/60">
            まだ静かです。ひとことが少し増えると、ここに今週の傾向が出てきます。
          </p>
        )}
      </section>

      <section className="rounded-calm border border-white/60 bg-white/70 p-5 shadow-quiet">
        <RecentEntries entries={data?.recentEntries ?? []} isLoading={isLoading} />
      </section>

      <details className="text-sm text-ink/55">
        <summary className="cursor-pointer list-none transition hover:text-ink">
          データ管理
        </summary>
        <div className="mt-3">
          <Link href="/settings" className="underline decoration-clay/30 underline-offset-4">
            書き出しや復元を見る
          </Link>
        </div>
      </details>
    </main>
  );
}

export default function ReviewPage() {
  return (
    <PasscodeGate scope="admin">
      <ReviewContent />
    </PasscodeGate>
  );
}
