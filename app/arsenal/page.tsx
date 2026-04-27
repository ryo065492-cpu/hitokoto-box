"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import ArsenalBoard from "@/components/ArsenalBoard";
import PasscodeGate from "@/components/PasscodeGate";
import type { ArsenalView } from "@/lib/arsenal/ammo";
import { getArsenalView } from "@/lib/services/appService";

function ArsenalContent() {
  const [view, setView] = useState<ArsenalView>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadView = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      setView(await getArsenalView());
    } catch {
      setError("弾薬庫を読み込めませんでした。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadView();
  }, [loadView]);

  return (
    <main className="space-y-6">
      <Link href="/review" className="text-sm text-ink/60 transition hover:text-ink">
        あとで見るへ戻る
      </Link>
      <ArsenalBoard view={view} isLoading={isLoading} error={error} onReload={() => void loadView()} />
    </main>
  );
}

export default function ArsenalPage() {
  return (
    <PasscodeGate scope="admin">
      <ArsenalContent />
    </PasscodeGate>
  );
}
