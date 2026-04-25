import { DEFAULT_SETTINGS, type AnalysisTag, type AppSettings, type DeveloperNote, type Entry, type ExportDataBundle, type MediaItem, type WeeklyInsight } from "@/domain/types";
import type { Repository } from "@/lib/storage/repository";

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? "サーバーに保存できませんでした。");
  }

  return (await response.json()) as T;
}

export class ApiRepository implements Repository {
  async createEntry(entry: Entry): Promise<Entry> {
    const result = await requestJson<{ entry: Entry }>("/api/entries", {
      method: "POST",
      body: JSON.stringify({ entry })
    });
    return result.entry;
  }

  async listEntries(options?: { limit?: number; memberId?: string }): Promise<Entry[]> {
    const params = new URLSearchParams();

    if (typeof options?.limit === "number") {
      params.set("limit", String(options.limit));
    }

    const suffix = params.toString() ? `?${params.toString()}` : "";
    const result = await requestJson<{ entries: Entry[] }>(`/api/entries${suffix}`);
    return result.entries;
  }

  async getEntry(id: string): Promise<Entry | undefined> {
    const result = await requestJson<{ entry?: Entry }>(`/api/entries?id=${encodeURIComponent(id)}`);
    return result.entry;
  }

  async deleteEntry(id: string): Promise<void> {
    await requestJson<{ ok: true }>(`/api/entries?id=${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
  }

  async saveMedia(): Promise<MediaItem> {
    throw new Error("写真はまだ共有保存できません。ひとことだけ残しました。");
  }

  async getMedia(): Promise<MediaItem | undefined> {
    return undefined;
  }

  async listMediaByEntry(): Promise<MediaItem[]> {
    return [];
  }

  async replaceAnalysisTags(): Promise<void> {
    return undefined;
  }

  async listAnalysisTags(): Promise<AnalysisTag[]> {
    return [];
  }

  async replaceWeeklyInsights(): Promise<void> {
    return undefined;
  }

  async listWeeklyInsights(weekStart?: string): Promise<WeeklyInsight[]> {
    const params = new URLSearchParams();

    if (weekStart) {
      params.set("weekStart", weekStart);
    }

    const suffix = params.toString() ? `?${params.toString()}` : "";
    const result = await requestJson<{ insights: WeeklyInsight[] }>(`/api/weekly${suffix}`);
    return result.insights;
  }

  async createDeveloperNote(note: DeveloperNote): Promise<DeveloperNote> {
    const result = await requestJson<{ note: DeveloperNote }>("/api/developer-notes", {
      method: "POST",
      body: JSON.stringify({ note })
    });
    return result.note;
  }

  async replaceDeveloperNotes(): Promise<void> {
    return undefined;
  }

  async listDeveloperNotes(): Promise<DeveloperNote[]> {
    const result = await requestJson<{ notes: DeveloperNote[] }>("/api/developer-notes");
    return result.notes;
  }

  async getSettings(): Promise<AppSettings> {
    return DEFAULT_SETTINGS;
  }

  async updateSettings(): Promise<AppSettings> {
    return DEFAULT_SETTINGS;
  }

  async exportAllData(): Promise<ExportDataBundle> {
    return requestJson<ExportDataBundle>("/api/export");
  }

  async importAllData(data: ExportDataBundle): Promise<void> {
    await requestJson<{ ok: true }>("/api/import", {
      method: "POST",
      body: JSON.stringify({ data })
    });
  }

  async clearAllData(): Promise<void> {
    await requestJson<{ ok: true }>("/api/clear", { method: "POST" });
  }
}

export const apiRepository = new ApiRepository();
