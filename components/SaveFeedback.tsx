interface SaveFeedbackProps {
  state: "idle" | "saving" | "success" | "media-warning" | "error";
}

export default function SaveFeedback({ state }: SaveFeedbackProps) {
  if (state === "idle") {
    return null;
  }

  if (state === "saving") {
    return <p className="text-sm text-ink/55">静かに残しています。</p>;
  }

  if (state === "error") {
    return (
      <p className="text-sm text-rose-700">
        うまく保存できませんでした。少し置いてから、もう一度お願いします。
      </p>
    );
  }

  if (state === "media-warning") {
    return (
      <div className="space-y-1 rounded-3xl border border-clay/20 bg-clay/10 px-4 py-3 text-sm">
        <p className="font-medium text-clay">ひとことは残しました</p>
        <p className="text-ink/65">保存できなかった写真があります。</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 rounded-3xl border border-leaf/20 bg-leaf/10 px-4 py-3 text-sm">
      <p className="font-medium text-leaf">残しました</p>
      <p className="text-ink/65">今日はここで閉じて OK です。</p>
    </div>
  );
}
