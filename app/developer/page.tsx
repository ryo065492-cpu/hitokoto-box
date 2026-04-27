"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import DeveloperPackPanel from "@/components/DeveloperPackPanel";
import DeveloperNotesList from "@/components/DeveloperNotesList";
import PasscodeGate from "@/components/PasscodeGate";
import type { DeveloperNote } from "@/domain/types";
import type { DeveloperPack } from "@/lib/developer/developerPack";
import { getDeveloperNotes, getDeveloperPack } from "@/lib/services/appService";

function DeveloperContent() {
  const [notes, setNotes] = useState<DeveloperNote[]>([]);
  const [pack, setPack] = useState<DeveloperPack>();
  const [packError, setPackError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [nextNotes, nextPack] = await Promise.all([getDeveloperNotes(), getDeveloperPack()]);
        setNotes(nextNotes);
        setPack(nextPack);
      } catch {
        setPackError("改善材料パックを読み込めませんでした。");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <main className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-ink/60 transition hover:text-ink">
          戻る
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">開発者向け</h1>
        <p className="mt-2 text-sm leading-7 text-ink/70">
          通常ユーザーには見せない奥の画面です。雑な違和感を、改善チケット候補に翻訳します。
        </p>
      </div>

      <section className="rounded-calm border border-white/60 bg-white/70 p-5 shadow-quiet">
        <DeveloperPackPanel pack={pack} isLoading={isLoading} error={packError} />
      </section>

      <section className="rounded-calm border border-white/60 bg-white/70 p-5 shadow-quiet">
        <DeveloperNotesList notes={notes} isLoading={isLoading} />
      </section>
    </main>
  );
}

export default function DeveloperPage() {
  return (
    <PasscodeGate scope="admin">
      <DeveloperContent />
    </PasscodeGate>
  );
}
