import type { DeveloperNote, Entry, AnalysisTag, WeeklyInsight } from "@/domain/types";

export interface AnalysisResult {
  tags: AnalysisTag[];
  developerNotes: DeveloperNote[];
}

export interface Analyzer {
  analyzeEntry(entry: Entry): AnalysisResult;
  generateWeeklyInsights(entries: Entry[]): WeeklyInsight[];
  generateDeveloperNotes(entries: Entry[]): DeveloperNote[];
}
