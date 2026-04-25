"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PasscodeGate from "@/components/PasscodeGate";
import WeeklySummary from "@/components/WeeklySummary";
import type { WeeklySummaryView } from "@/lib/services/appService";
import { getWeeklySummaryView } from "@/lib/services/appService";

function WeeklyContent() {
  const [data, setData] = useState<WeeklySummaryView | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const nextData = await getWeeklySummaryView();
        setData(nextData);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <main className="space-y-6">
      <div>
        <Link href="/review" className="text-sm text-ink/60 transition hover:text-ink">
          戻る
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">週のまとめ</h1>
        <p className="mt-2 text-sm leading-7 text-ink/70">
          全部を変えようとしなくて大丈夫です。今週は 1 つだけ試せば十分です。
        </p>
      </div>

      <WeeklySummary
        insights={data?.insights ?? []}
        suggestedTrial={data?.suggestedTrial}
        chatGptPrompt={data?.chatGptPrompt}
        hasDeveloperDetails={data?.hasDeveloperDetails}
        isLoading={isLoading}
      />
    </main>
  );
}

export default function WeeklyPage() {
  return (
    <PasscodeGate scope="admin">
      <WeeklyContent />
    </PasscodeGate>
  );
}
