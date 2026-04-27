import {
  APP_SCHEMA_VERSION,
  DEFAULT_SETTINGS,
  type AppSettings,
  type DeveloperNote,
  type Entry,
  type EntrySource,
  type MediaItem,
  type WeeklyInsight
} from "@/domain/types";
import { RuleBasedAnalyzer } from "@/lib/analyzer/ruleBasedAnalyzer";
import { getWeekRange } from "@/lib/dates/week";
import { buildDeveloperPack, type DeveloperPack } from "@/lib/developer/developerPack";
import { compressImage } from "@/lib/media/imageCompression";
import { activeRepository, isCloudStorageMode } from "@/lib/storage/activeRepository";
import type { Repository } from "@/lib/storage/repository";
import { createId } from "@/lib/utils/id";

const analyzer = new RuleBasedAnalyzer();

export interface CaptureEntryInput {
  memberId?: string;
  text: string;
  files: File[];
  usedVoiceInput: boolean;
}

export type MediaSaveStatus = "none" | "saved" | "partial" | "failed";

export interface CaptureEntryResult {
  entry: Entry;
  mediaStatus: MediaSaveStatus;
  savedMediaCount: number;
  failedMediaCount: number;
}

export interface CaptureEntryDependencies {
  repository: Pick<Repository, "createEntry" | "deleteEntry" | "getSettings" | "saveMedia">;
  compressImage: typeof compressImage;
  refreshDerivedData?: () => Promise<void>;
  createId?: typeof createId;
  now?: () => Date;
}

export interface RecentEntryView extends Entry {
  photoCount: number;
}

export interface ReviewOverview {
  recentEntries: RecentEntryView[];
  themes: Array<{
    title: string;
    summary: string;
  }>;
}

export interface WeeklySummaryView {
  insights: WeeklyInsight[];
  suggestedTrial?: string;
  chatGptPrompt?: string;
  hasDeveloperDetails: boolean;
}

function deriveEntrySource(text: string, mediaCount: number, usedVoiceInput: boolean): EntrySource {
  const hasText = text.trim().length > 0;
  const hasPhotos = mediaCount > 0;

  if (hasPhotos && (hasText || usedVoiceInput)) {
    return "mixed";
  }

  if (hasPhotos) {
    return "photo";
  }

  if (usedVoiceInput) {
    return "voice";
  }

  return "text";
}

async function refreshDerivedData(): Promise<void> {
  const entries = await activeRepository.listEntries();
  const { weekStart } = getWeekRange(new Date());

  for (const entry of entries) {
    const analysis = analyzer.analyzeEntry(entry);
    await activeRepository.replaceAnalysisTags(entry.id, analysis.tags);
  }

  const weeklyInsights = analyzer.generateWeeklyInsights(entries);
  await activeRepository.replaceWeeklyInsights(weekStart, weeklyInsights);

  const developerNotes = analyzer.generateDeveloperNotes(entries);
  await activeRepository.replaceDeveloperNotes(developerNotes);
}

export async function rebuildDerivedData(): Promise<void> {
  await refreshDerivedData();
}

function buildChatGptPrompt(insights: WeeklyInsight[]): string | undefined {
  const candidate = insights.find(
    (insight) => insight.category === "ai_use" || insight.category === "automation"
  );

  if (!candidate) {
    return undefined;
  }

  return [
    "家族の日常で続いている困りごとについて相談です。",
    `テーマ: ${candidate.title}`,
    `今週のまとめ: ${candidate.summary}`,
    `まず1つだけ試すなら: ${candidate.suggestedAction}`,
    "家族に負担を増やさずに始められるやり方を3案ください。"
  ].join("\n");
}

export async function getSettings(): Promise<AppSettings> {
  return activeRepository.getSettings();
}

export function resolveCaptureMemberId(memberId: string | undefined, settings: AppSettings): string {
  return memberId ?? settings.defaultMemberId ?? DEFAULT_SETTINGS.defaultMemberId;
}

function resolveMediaStatus(
  requestedMediaCount: number,
  savedMediaCount: number,
  failedMediaCount: number
): MediaSaveStatus {
  if (requestedMediaCount === 0) {
    return "none";
  }

  if (failedMediaCount === 0) {
    return "saved";
  }

  return savedMediaCount > 0 ? "partial" : "failed";
}

export async function captureEntryWithDependencies(
  input: CaptureEntryInput,
  dependencies: CaptureEntryDependencies
): Promise<CaptureEntryResult> {
  const text = input.text.trim();

  if (!text && input.files.length === 0) {
    throw new Error("保存する内容がありません。");
  }

  const idFactory = dependencies.createId ?? createId;
  const nowFactory = dependencies.now ?? (() => new Date());
  const now = nowFactory().toISOString();
  const entryId = idFactory("entry");
  const settings = await dependencies.repository.getSettings();

  const entry: Entry = {
    id: entryId,
    memberId: resolveCaptureMemberId(input.memberId, settings),
    text,
    mediaIds: [],
    source: deriveEntrySource(text, 0, input.usedVoiceInput),
    visibility: "family",
    createdAt: now,
    updatedAt: now,
    schemaVersion: APP_SCHEMA_VERSION
  };

  try {
    await dependencies.repository.createEntry(entry);
  } catch {
    throw new Error("保存に失敗しました。");
  }

  const savedMediaItems: MediaItem[] = [];
  let failedMediaCount = 0;

  for (const file of input.files) {
    try {
      const compressed = await dependencies.compressImage(file, { maxWidth: 1600, quality: 0.82 });
      const mediaItem: MediaItem = {
        id: idFactory("media"),
        entryId,
        type: "image",
        mimeType: compressed.mimeType,
        blob: compressed.blob,
        width: compressed.width,
        height: compressed.height,
        createdAt: now
      };

      await dependencies.repository.saveMedia(mediaItem);
      savedMediaItems.push(mediaItem);
    } catch {
      failedMediaCount += 1;
    }
  }

  if (!text && input.files.length > 0 && savedMediaItems.length === 0) {
    await dependencies.repository.deleteEntry(entryId).catch(() => undefined);
    throw new Error("写真を保存できませんでした。");
  }

  let finalEntry = entry;

  if (savedMediaItems.length > 0) {
    const updatedEntry: Entry = {
      ...entry,
      mediaIds: savedMediaItems.map((mediaItem) => mediaItem.id),
      source: deriveEntrySource(text, savedMediaItems.length, input.usedVoiceInput),
      updatedAt: nowFactory().toISOString()
    };

    try {
      finalEntry = await dependencies.repository.createEntry(updatedEntry);
    } catch {
      if (!text) {
        await dependencies.repository.deleteEntry(entryId).catch(() => undefined);
        throw new Error("写真を保存できませんでした。");
      }

      failedMediaCount = input.files.length;
      finalEntry = entry;
    }
  }

  await dependencies.refreshDerivedData?.().catch(() => undefined);

  return {
    entry: finalEntry,
    mediaStatus: resolveMediaStatus(input.files.length, finalEntry.mediaIds.length, failedMediaCount),
    savedMediaCount: finalEntry.mediaIds.length,
    failedMediaCount
  };
}

export async function captureEntry(input: CaptureEntryInput): Promise<CaptureEntryResult> {
  return captureEntryWithDependencies(input, {
    repository: activeRepository,
    compressImage,
    refreshDerivedData: isCloudStorageMode() ? undefined : refreshDerivedData
  });
}

export async function getReviewOverview(): Promise<ReviewOverview> {
  const { weekStart } = getWeekRange(new Date());

  const [entries, weeklyInsights] = await Promise.all([
    activeRepository.listEntries({ limit: 3 }),
    activeRepository.listWeeklyInsights(weekStart)
  ]);

  return {
    recentEntries: entries.map((entry) => ({
      ...entry,
      photoCount: entry.mediaIds.length
    })),
    themes: weeklyInsights.slice(0, 3).map((insight) => ({
      title: insight.title,
      summary: insight.summary
    }))
  };
}

export async function getWeeklySummaryView(): Promise<WeeklySummaryView> {
  const { weekStart } = getWeekRange(new Date());

  const [insights, notes] = await Promise.all([
    activeRepository.listWeeklyInsights(weekStart),
    activeRepository.listDeveloperNotes()
  ]);

  const limitedInsights = insights.slice(0, 3);

  return {
    insights: limitedInsights,
    suggestedTrial: limitedInsights[0]?.suggestedAction,
    chatGptPrompt: buildChatGptPrompt(limitedInsights),
    hasDeveloperDetails: notes.length > 0
  };
}

export async function getDeveloperNotes(): Promise<DeveloperNote[]> {
  return activeRepository.listDeveloperNotes();
}

export async function getDeveloperPack(): Promise<DeveloperPack> {
  const entries = await activeRepository.listEntries({ limit: 50 });
  return buildDeveloperPack(entries, "v0.9");
}

export async function clearAllData(): Promise<void> {
  await activeRepository.clearAllData();
}

export async function seedSampleData(): Promise<void> {
  await activeRepository.clearAllData();
  const settings = await activeRepository.getSettings();
  const [ryo, wife, family] = settings.familyMembers;

  const samples: Array<Pick<Entry, "memberId" | "text" | "source" | "visibility"> & { daysAgo: number }> = [
    {
      memberId: ryo?.id ?? DEFAULT_SETTINGS.defaultMemberId,
      text: "また冷蔵庫見ながら買い物リスト作るの面倒だった",
      source: "text",
      visibility: "family",
      daysAgo: 4
    },
    {
      memberId: wife?.id ?? DEFAULT_SETTINGS.defaultMemberId,
      text: "保育園の書類、何を書けばいいか毎回迷う",
      source: "text",
      visibility: "family",
      daysAgo: 3
    },
    {
      memberId: family?.id ?? DEFAULT_SETTINGS.defaultMemberId,
      text: "保存したあと、本当に残ったのか分からなくて不安",
      source: "text",
      visibility: "family",
      daysAgo: 2
    },
    {
      memberId: ryo?.id ?? DEFAULT_SETTINGS.defaultMemberId,
      text: "会議後のメールがめんどい",
      source: "text",
      visibility: "family",
      daysAgo: 2
    },
    {
      memberId: wife?.id ?? DEFAULT_SETTINGS.defaultMemberId,
      text: "この画面、毎回見るのは邪魔",
      source: "text",
      visibility: "family",
      daysAgo: 1
    },
    {
      memberId: ryo?.id ?? DEFAULT_SETTINGS.defaultMemberId,
      text: "Excelの数字を見て何を報告すればいいか迷った",
      source: "text",
      visibility: "family",
      daysAgo: 0
    }
  ];

  for (const sample of samples) {
    const date = new Date();
    date.setDate(date.getDate() - sample.daysAgo);
    date.setHours(9 + sample.daysAgo, 15, 0, 0);

    await activeRepository.createEntry({
      id: createId("entry"),
      memberId: sample.memberId,
      text: sample.text,
      mediaIds: [],
      source: sample.source,
      visibility: sample.visibility,
      createdAt: date.toISOString(),
      updatedAt: date.toISOString(),
      schemaVersion: APP_SCHEMA_VERSION
    });
  }

  await refreshDerivedData();
}
