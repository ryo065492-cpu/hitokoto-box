"use client";

import { useState } from "react";

interface CopyButtonProps {
  text: string;
  label: string;
}

export default function CopyButton({ text, label }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={() => {
        void handleClick();
      }}
      className="rounded-full border border-clay/20 bg-white/80 px-4 py-2 text-sm text-clay transition hover:border-clay/40"
    >
      {copied ? "コピーしました" : label}
    </button>
  );
}
