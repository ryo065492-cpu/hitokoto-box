import CopyButton from "@/components/CopyButton";
import type { DeveloperPack } from "@/lib/developer/developerPack";

interface DeveloperPackPanelProps {
  pack?: DeveloperPack;
  isLoading?: boolean;
  error?: string;
}

export default function DeveloperPackPanel({
  pack,
  isLoading = false,
  error = ""
}: DeveloperPackPanelProps) {
  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-clay">裏側の整理</p>
          <h2 className="mt-1 text-base font-semibold">改善材料パック</h2>
        </div>
        {pack ? <p className="text-xs text-ink/50">直近 {pack.entryCount} 件から作成</p> : null}
      </div>

      <p className="mt-3 text-sm leading-7 text-ink/65">
        直近のひとことを、相談や改修に渡しやすい形へまとめます。ホーム画面には出さない、裏側だけの材料です。
      </p>

      {isLoading ? (
        <p className="mt-4 text-sm text-ink/55">材料をまとめています。</p>
      ) : error ? (
        <p className="mt-4 text-sm text-ink/60">{error}</p>
      ) : pack ? (
        <div className="mt-5 space-y-5">
          <div className="flex flex-wrap gap-3">
            <CopyButton text={pack.chatGptSummary} label="ChatGPT用まとめをコピー" />
            <CopyButton text={pack.codexInstruction} label="Codex用改善指示をコピー" />
            <CopyButton text={pack.familyBetaReview} label="家族内βレビューをコピー" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-mist bg-paper/80 p-4">
              <h3 className="text-sm font-semibold">新しく出てきた話題</h3>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/70">
                {pack.newTopics.map((topic) => (
                  <li key={topic}>- {topic}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-mist bg-paper/80 p-4">
              <h3 className="text-sm font-semibold">よく出たテーマ</h3>
              {pack.frequentThemes.length ? (
                <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/70">
                  {pack.frequentThemes.map((theme) => (
                    <li key={theme}>- {theme}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm leading-6 text-ink/60">
                  まだ十分な傾向はありません。もう少し集まってから見るとよさそうです。
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-ink/60">
          まだ材料にできるひとことがありません。
        </p>
      )}
    </div>
  );
}
