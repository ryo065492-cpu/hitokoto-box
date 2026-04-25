"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

interface PhotoPickerProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
}

export default function PhotoPicker({ files, onFilesChange, disabled }: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  const countLabel = useMemo(() => {
    if (files.length === 0) {
      return "写真を添える";
    }

    return `写真 ${files.length} 枚`;
  }, [files.length]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="rounded-full border border-clay/20 bg-white/80 px-4 py-2 text-sm text-ink transition hover:border-clay/40 disabled:opacity-50"
        >
          {countLabel}
        </button>

        <p className="text-xs text-ink/55">保存前に端末側で軽く圧縮します。</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(event) => {
          const nextFiles = Array.from(event.target.files ?? []);
          onFilesChange([...files, ...nextFiles]);
          event.target.value = "";
        }}
      />

      {previewUrls.length ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {previewUrls.map((url, index) => (
            <div
              key={url}
              className="overflow-hidden rounded-3xl border border-white/70 bg-white/80"
            >
              <div className="relative aspect-square">
                <Image
                  src={url}
                  alt={`選択した写真 ${index + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <button
                type="button"
                onClick={() => onFilesChange(files.filter((_, fileIndex) => fileIndex !== index))}
                className="w-full border-t border-mist px-3 py-2 text-xs text-ink/65 transition hover:text-ink"
              >
                はずす
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
