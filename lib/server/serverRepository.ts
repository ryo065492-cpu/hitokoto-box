import {
  APP_SCHEMA_VERSION,
  DEFAULT_SETTINGS,
  type AnalysisTag,
  type AppSettings,
  type DeveloperNote,
  type Entry,
  type EntrySource,
  type ExportDataBundle,
  type MediaItem,
  type WeeklyInsight,
  type WeeklyInsightCategory
} from "@/domain/types";
import type { Repository } from "@/lib/storage/repository";
import { requireServerSupabaseConfig, type ServerSupabaseConfig } from "@/lib/server/supabaseServer";

type EntryRow = {
  id: string;
  text: string;
  source: string | null;
  created_at: string;
  updated_at: string;
};

type AttachmentRow = {
  id: string;
  entry_id: string;
  type: string | null;
  name: string | null;
  mime_type: string | null;
  size: number | null;
  storage_path: string | null;
  created_at: string;
};

type WeeklyInsightRow = {
  id: string;
  week_start: string;
  week_end: string;
  title: string;
  summary: string;
  suggested_action: string;
  source_entry_ids: unknown;
  opportunities: unknown;
  created_at: string;
};

type DeveloperNoteRow = {
  id: string;
  source_entry_id: string;
  raw_text: string;
  interpreted_issue: string;
  user_pain: string;
  desired_experience: string;
  suggested_fix: string;
  acceptance_criteria: unknown;
  one_question_to_ask: string | null;
  codex_spec: string;
  created_at: string;
};

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

function toSupabaseId(id: string): string {
  return id.match(UUID_PATTERN)?.[0] ?? id;
}

function toEntrySource(source: string | null): EntrySource {
  if (
    source === "voice" ||
    source === "photo" ||
    source === "mixed" ||
    source === "ios_shortcut" ||
    source === "ios_share_sheet"
  ) {
    return source;
  }

  return "text";
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function encodeIn(values: string[]): string {
  return `(${values.map((value) => `"${toSupabaseId(value)}"`).join(",")})`;
}

async function ensureOk(response: Response): Promise<Response> {
  if (response.ok) {
    return response;
  }

  const body = await response.text();
  throw new Error(body || `Supabase request failed: ${response.status}`);
}

export class ServerSupabaseRepository implements Repository {
  private readonly restUrl: string;
  private readonly serviceRoleKey: string;

  constructor(config: ServerSupabaseConfig = requireServerSupabaseConfig()) {
    this.restUrl = `${config.url.replace(/\/$/, "")}/rest/v1`;
    this.serviceRoleKey = config.serviceRoleKey;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.restUrl}${path}`, {
      ...init,
      headers: {
        apikey: this.serviceRoleKey,
        Authorization: `Bearer ${this.serviceRoleKey}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {})
      }
    });

    await ensureOk(response);

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  private async listAttachmentsByEntryIds(entryIds: string[]): Promise<Map<string, string[]>> {
    if (!entryIds.length) {
      return new Map();
    }

    const rows = await this.request<AttachmentRow[]>(
      `/attachments?select=id,entry_id&entry_id=in.${encodeURIComponent(encodeIn(entryIds))}`
    );
    const map = new Map<string, string[]>();

    for (const row of rows) {
      const current = map.get(row.entry_id) ?? [];
      current.push(row.id);
      map.set(row.entry_id, current);
    }

    return map;
  }

  private toEntry(row: EntryRow, mediaIds?: string[]): Entry {
    return {
      id: row.id,
      memberId: DEFAULT_SETTINGS.defaultMemberId,
      text: row.text,
      mediaIds: mediaIds ?? [],
      source: toEntrySource(row.source),
      visibility: "family",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      schemaVersion: APP_SCHEMA_VERSION
    };
  }

  async createEntry(entry: Entry): Promise<Entry> {
    const id = toSupabaseId(entry.id);
    const rows = await this.request<EntryRow[]>(`/entries?on_conflict=id`, {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify({
        id,
        text: entry.text,
        source: entry.source,
        updated_at: entry.updatedAt,
        created_at: entry.createdAt
      })
    });

    if (!rows[0]) {
      throw new Error("Supabase did not return the saved entry.");
    }

    return this.toEntry(rows[0], entry.mediaIds);
  }

  async listEntries(options?: { limit?: number; memberId?: string }): Promise<Entry[]> {
    const params = new URLSearchParams({
      select: "id,text,source,created_at,updated_at",
      order: "created_at.desc"
    });

    if (typeof options?.limit === "number") {
      params.set("limit", String(options.limit));
    }

    const rows = await this.request<EntryRow[]>(`/entries?${params.toString()}`);
    const attachmentsByEntryId = await this.listAttachmentsByEntryIds(rows.map((row) => row.id));
    return rows.map((row) => this.toEntry(row, attachmentsByEntryId.get(row.id) ?? []));
  }

  async getEntry(id: string): Promise<Entry | undefined> {
    const rows = await this.request<EntryRow[]>(
      `/entries?select=id,text,source,created_at,updated_at&id=eq.${toSupabaseId(id)}&limit=1`
    );

    if (!rows[0]) {
      return undefined;
    }

    const attachmentsByEntryId = await this.listAttachmentsByEntryIds([rows[0].id]);
    return this.toEntry(rows[0], attachmentsByEntryId.get(rows[0].id) ?? []);
  }

  async deleteEntry(id: string): Promise<void> {
    await this.request<void>(`/entries?id=eq.${toSupabaseId(id)}`, { method: "DELETE" });
  }

  async saveMedia(media: MediaItem): Promise<MediaItem> {
    const id = toSupabaseId(media.id);
    const entryId = toSupabaseId(media.entryId);
    const rows = await this.request<AttachmentRow[]>(`/attachments?on_conflict=id`, {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify({
        id,
        entry_id: entryId,
        type: media.type,
        name: media.id,
        mime_type: media.mimeType,
        size: media.blob.size,
        storage_path: null,
        created_at: media.createdAt
      })
    });

    return {
      ...media,
      id: rows[0]?.id ?? id,
      entryId: rows[0]?.entry_id ?? entryId
    };
  }

  async getMedia(id: string): Promise<MediaItem | undefined> {
    const rows = await this.request<AttachmentRow[]>(`/attachments?select=*&id=eq.${toSupabaseId(id)}&limit=1`);
    const row = rows[0];

    if (!row) {
      return undefined;
    }

    return {
      id: row.id,
      entryId: row.entry_id,
      type: "image",
      mimeType: row.mime_type ?? "image/jpeg",
      blob: new Blob([]),
      createdAt: row.created_at
    };
  }

  async listMediaByEntry(entryId: string): Promise<MediaItem[]> {
    const rows = await this.request<AttachmentRow[]>(
      `/attachments?select=*&entry_id=eq.${toSupabaseId(entryId)}&order=created_at.asc`
    );

    return rows.map((row) => ({
      id: row.id,
      entryId: row.entry_id,
      type: "image",
      mimeType: row.mime_type ?? "image/jpeg",
      blob: new Blob([]),
      createdAt: row.created_at
    }));
  }

  async replaceAnalysisTags(): Promise<void> {
    return undefined;
  }

  async listAnalysisTags(): Promise<AnalysisTag[]> {
    return [];
  }

  async replaceWeeklyInsights(weekStart: string, insights: WeeklyInsight[]): Promise<void> {
    await this.request<void>(`/weekly_insights?week_start=eq.${weekStart}`, { method: "DELETE" });

    if (insights.length) {
      await this.insertWeeklyInsights(insights);
    }
  }

  private async insertWeeklyInsights(insights: WeeklyInsight[]): Promise<void> {
    await this.request<WeeklyInsightRow[]>(`/weekly_insights`, {
      method: "POST",
      headers: {
        Prefer: "return=representation"
      },
      body: JSON.stringify(
        insights.map((insight) => ({
          id: toSupabaseId(insight.id),
          week_start: insight.weekStart,
          week_end: insight.weekEnd,
          title: insight.title,
          summary: insight.summary,
          suggested_action: insight.suggestedAction,
          source_entry_ids: insight.sourceEntryIds.map(toSupabaseId),
          opportunities: { category: insight.category, priority: insight.priority },
          created_at: insight.createdAt
        }))
      )
    });
  }

  async listWeeklyInsights(weekStart?: string): Promise<WeeklyInsight[]> {
    const params = new URLSearchParams({
      select: "*",
      order: "created_at.desc"
    });

    if (weekStart) {
      params.set("week_start", `eq.${weekStart}`);
    }

    const rows = await this.request<WeeklyInsightRow[]>(`/weekly_insights?${params.toString()}`);
    return rows.map((row, index) => {
      const opportunities = row.opportunities as { category?: WeeklyInsightCategory; priority?: number } | null;

      return {
        id: row.id,
        weekStart: row.week_start,
        weekEnd: row.week_end,
        title: row.title,
        summary: row.summary,
        suggestedAction: row.suggested_action,
        category: opportunities?.category ?? "life_improvement",
        sourceEntryIds: toStringArray(row.source_entry_ids),
        priority: (opportunities?.priority ?? Math.max(1, 3 - index)) as WeeklyInsight["priority"],
        createdAt: row.created_at
      };
    });
  }

  async createDeveloperNote(note: DeveloperNote): Promise<DeveloperNote> {
    const rows = await this.request<DeveloperNoteRow[]>(`/developer_notes?on_conflict=id`, {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify(this.toDeveloperNoteRow(note))
    });

    if (!rows[0]) {
      throw new Error("Supabase did not return the saved developer note.");
    }

    return this.toDeveloperNote(rows[0]);
  }

  async replaceDeveloperNotes(notes: DeveloperNote[]): Promise<void> {
    await this.request<void>(`/developer_notes?id=not.is.null`, { method: "DELETE" });

    if (!notes.length) {
      return;
    }

    await this.request<DeveloperNoteRow[]>(`/developer_notes`, {
      method: "POST",
      headers: {
        Prefer: "return=representation"
      },
      body: JSON.stringify(notes.map((note) => this.toDeveloperNoteRow(note)))
    });
  }

  async listDeveloperNotes(): Promise<DeveloperNote[]> {
    const rows = await this.request<DeveloperNoteRow[]>(`/developer_notes?select=*&order=created_at.desc`);
    return rows.map((row) => this.toDeveloperNote(row));
  }

  async getSettings(): Promise<AppSettings> {
    return DEFAULT_SETTINGS;
  }

  async updateSettings(settings: AppSettings): Promise<AppSettings> {
    return {
      ...DEFAULT_SETTINGS,
      defaultMemberId: settings.defaultMemberId ?? DEFAULT_SETTINGS.defaultMemberId,
      quietMode: true
    };
  }

  async exportAllData(): Promise<ExportDataBundle> {
    const [settings, entries, weeklyInsights, developerNotes] = await Promise.all([
      this.getSettings(),
      this.listEntries(),
      this.listWeeklyInsights(),
      this.listDeveloperNotes()
    ]);

    return {
      schemaVersion: settings.schemaVersion,
      exportedAt: new Date().toISOString(),
      settings,
      entries,
      mediaItems: [],
      analysisTags: [],
      weeklyInsights,
      developerNotes
    };
  }

  async importAllData(data: ExportDataBundle): Promise<void> {
    await this.clearAllData();

    for (const entry of data.entries ?? []) {
      await this.createEntry(entry);
    }

    if (data.weeklyInsights?.length) {
      await this.insertWeeklyInsights(data.weeklyInsights);
    }

    await this.replaceDeveloperNotes(data.developerNotes ?? []);
  }

  async clearAllData(): Promise<void> {
    await this.request<void>(`/developer_notes?id=not.is.null`, { method: "DELETE" });
    await this.request<void>(`/weekly_insights?id=not.is.null`, { method: "DELETE" });
    await this.request<void>(`/attachments?id=not.is.null`, { method: "DELETE" });
    await this.request<void>(`/entries?id=not.is.null`, { method: "DELETE" });
  }

  private toDeveloperNoteRow(note: DeveloperNote): Omit<DeveloperNoteRow, "created_at"> & {
    created_at: string;
  } {
    return {
      id: toSupabaseId(note.id),
      source_entry_id: toSupabaseId(note.sourceEntryId),
      raw_text: note.rawText,
      interpreted_issue: note.interpretedIssue,
      user_pain: note.userPain,
      desired_experience: note.idealExperience,
      suggested_fix: note.suggestedFix,
      acceptance_criteria: note.acceptanceCriteria,
      one_question_to_ask: note.oneQuestionToAsk ?? null,
      codex_spec: note.codexPrompt,
      created_at: note.createdAt
    };
  }

  private toDeveloperNote(row: DeveloperNoteRow): DeveloperNote {
    return {
      id: row.id,
      sourceEntryId: row.source_entry_id,
      rawText: row.raw_text,
      interpretedIssue: row.interpreted_issue,
      userPain: row.user_pain,
      idealExperience: row.desired_experience,
      suggestedFix: row.suggested_fix,
      acceptanceCriteria: toStringArray(row.acceptance_criteria),
      oneQuestionToAsk: row.one_question_to_ask ?? undefined,
      codexPrompt: row.codex_spec,
      status: "new",
      createdAt: row.created_at
    };
  }
}

export function createServerRepository(): Repository {
  return new ServerSupabaseRepository();
}
