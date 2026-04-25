import type {
  AnalysisTag,
  AppSettings,
  DeveloperNote,
  Entry,
  ExportDataBundle,
  MediaItem,
  WeeklyInsight
} from "@/domain/types";

export interface Repository {
  createEntry(entry: Entry): Promise<Entry>;
  listEntries(options?: { limit?: number; memberId?: string }): Promise<Entry[]>;
  getEntry(id: string): Promise<Entry | undefined>;
  deleteEntry(id: string): Promise<void>;
  saveMedia(media: MediaItem): Promise<MediaItem>;
  getMedia(id: string): Promise<MediaItem | undefined>;
  listMediaByEntry(entryId: string): Promise<MediaItem[]>;
  replaceAnalysisTags(entryId: string, tags: AnalysisTag[]): Promise<void>;
  listAnalysisTags(entryIds?: string[]): Promise<AnalysisTag[]>;
  replaceWeeklyInsights(weekStart: string, insights: WeeklyInsight[]): Promise<void>;
  listWeeklyInsights(weekStart?: string): Promise<WeeklyInsight[]>;
  createDeveloperNote(note: DeveloperNote): Promise<DeveloperNote>;
  replaceDeveloperNotes(notes: DeveloperNote[]): Promise<void>;
  listDeveloperNotes(): Promise<DeveloperNote[]>;
  getSettings(): Promise<AppSettings>;
  updateSettings(settings: AppSettings): Promise<AppSettings>;
  exportAllData(): Promise<ExportDataBundle>;
  importAllData(data: ExportDataBundle): Promise<void>;
  clearAllData(): Promise<void>;
}
