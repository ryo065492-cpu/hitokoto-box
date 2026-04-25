import { RuleBasedAnalyzer } from "@/lib/analyzer/ruleBasedAnalyzer";
import { getWeekRange } from "@/lib/dates/week";
import type { Repository } from "@/lib/storage/repository";

const analyzer = new RuleBasedAnalyzer();

export async function refreshServerDerivedData(repository: Repository): Promise<void> {
  const entries = await repository.listEntries();
  const { weekStart } = getWeekRange(new Date());

  for (const entry of entries) {
    const analysis = analyzer.analyzeEntry(entry);
    await repository.replaceAnalysisTags(entry.id, analysis.tags);
  }

  const weeklyInsights = analyzer.generateWeeklyInsights(entries);
  await repository.replaceWeeklyInsights(weekStart, weeklyInsights);

  const developerNotes = analyzer.generateDeveloperNotes(entries);
  await repository.replaceDeveloperNotes(developerNotes);
}

export async function refreshServerDerivedDataSafely(repository: Repository): Promise<void> {
  await refreshServerDerivedData(repository).catch(() => undefined);
}
