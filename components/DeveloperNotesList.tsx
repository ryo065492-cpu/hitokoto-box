import CopyButton from "@/components/CopyButton";
import type { DeveloperNote } from "@/domain/types";

interface DeveloperNotesListProps {
  notes: DeveloperNote[];
  isLoading?: boolean;
}

export default function DeveloperNotesList({
  notes,
  isLoading = false
}: DeveloperNotesListProps) {
  return (
    <div>
      <h2 className="text-base font-semibold">改善チケット候補</h2>

      {isLoading ? (
        <p className="mt-4 text-sm text-ink/55">開発者向けメモを整えています。</p>
      ) : notes.length ? (
        <div className="mt-4 space-y-4">
          {notes.map((note) => (
            <article
              key={note.id}
              className="rounded-3xl border border-mist bg-paper/80 p-4 text-sm"
            >
              <p className="text-xs text-ink/50">元になったひとこと</p>
              <p className="mt-1 leading-6">{note.rawText}</p>

              <div className="mt-4 grid gap-3">
                <div>
                  <p className="text-xs text-ink/50">課題</p>
                  <p className="mt-1 leading-6">{note.interpretedIssue}</p>
                </div>
                <div>
                  <p className="text-xs text-ink/50">ユーザーの痛み</p>
                  <p className="mt-1 leading-6">{note.userPain}</p>
                </div>
                <div>
                  <p className="text-xs text-ink/50">理想の体験</p>
                  <p className="mt-1 leading-6">{note.idealExperience}</p>
                </div>
                <div>
                  <p className="text-xs text-ink/50">改善案</p>
                  <p className="mt-1 leading-6">{note.suggestedFix}</p>
                </div>
                <div>
                  <p className="text-xs text-ink/50">受け入れ条件</p>
                  <ul className="mt-2 space-y-1 text-sm leading-6 text-ink/75">
                    {note.acceptanceCriteria.map((criterion) => (
                      <li key={criterion}>- {criterion}</li>
                    ))}
                  </ul>
                </div>
                {note.oneQuestionToAsk ? (
                  <div>
                    <p className="text-xs text-ink/50">追加で聞くなら 1 問だけ</p>
                    <p className="mt-1 leading-6">{note.oneQuestionToAsk}</p>
                  </div>
                ) : null}
              </div>

              <div className="mt-4">
                <CopyButton text={note.codexPrompt} label="Codex 向け指示文をコピー" />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-ink/60">
          まだ app feedback 由来の開発メモはありません。違和感のあるひとことが入ると、ここに翻訳されます。
        </p>
      )}
    </div>
  );
}
