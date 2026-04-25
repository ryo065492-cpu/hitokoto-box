import { formatDateTime } from "@/lib/dates/week";
import type { RecentEntryView } from "@/lib/services/appService";

interface RecentEntriesProps {
  entries: RecentEntryView[];
  isLoading?: boolean;
}

export default function RecentEntries({ entries, isLoading = false }: RecentEntriesProps) {
  return (
    <div>
      <h2 className="text-base font-semibold">最近のひとこと</h2>

      {isLoading ? (
        <p className="mt-4 text-sm text-ink/55">読み込み中です。</p>
      ) : entries.length ? (
        <div className="mt-4 space-y-3">
          {entries.map((entry) => (
            <article
              key={entry.id}
              className="rounded-3xl border border-mist bg-paper/80 px-4 py-4"
            >
              <div className="flex items-center gap-2 text-xs text-ink/55">
                <span>{formatDateTime(entry.createdAt)}</span>
                {entry.photoCount > 0 ? (
                  <>
                    <span>•</span>
                    <span>写真 {entry.photoCount} 枚</span>
                  </>
                ) : null}
              </div>
              <p className="mt-2 text-sm leading-7">
                {entry.text || (entry.photoCount > 0 ? "写真を残しました" : "ひとことを残しました")}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-ink/60">
          まだ記録がありません。ホームでひとことを 1 つ残すと、ここに並びます。
        </p>
      )}
    </div>
  );
}
