import type { ExportDataBundle } from "@/domain/types";
import type { Repository } from "@/lib/storage/repository";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function assertValidExportDataBundle(value: unknown): asserts value is ExportDataBundle {
  if (!isRecord(value)) {
    throw new Error("ひとこと箱の JSON を読み込めませんでした。");
  }

  const requiredArrays = [
    "entries",
    "mediaItems",
    "analysisTags",
    "weeklyInsights",
    "developerNotes"
  ] as const;

  if (!isRecord(value.settings)) {
    throw new Error("ひとこと箱の JSON を読み込めませんでした。");
  }

  for (const key of requiredArrays) {
    if (!Array.isArray(value[key])) {
      throw new Error("ひとこと箱の JSON を読み込めませんでした。");
    }
  }
}

export async function exportRepositoryToJson(repository: Repository): Promise<string> {
  const data = await repository.exportAllData();
  return JSON.stringify(data, null, 2);
}

export function downloadJson(filename: string, content: string): void {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function importJsonString(
  repository: Repository,
  content: string
): Promise<ExportDataBundle> {
  const parsed = JSON.parse(content) as unknown;
  assertValidExportDataBundle(parsed);
  await repository.importAllData(parsed);
  return parsed;
}

export async function importJsonFile(repository: Repository, file: File): Promise<ExportDataBundle> {
  const content = await file.text();
  return importJsonString(repository, content);
}
