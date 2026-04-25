import {
  DEFAULT_SETTINGS,
  type AnalysisTag,
  type AppSettings,
  type DeveloperNote,
  type Entry,
  type ExportDataBundle,
  type MediaExportItem,
  type MediaItem,
  type WeeklyInsight
} from "@/domain/types";
import type { Repository } from "@/lib/storage/repository";

const DATABASE_NAME = "hitokoto-bako";
const DATABASE_VERSION = 1;
const SETTINGS_KEY = "app-settings";

type StoreName =
  | "entries"
  | "mediaItems"
  | "analysisTags"
  | "weeklyInsights"
  | "developerNotes"
  | "settings";

interface SettingsRecord {
  key: string;
  value: AppSettings;
}

function normalizeSettings(settings?: AppSettings): AppSettings {
  const familyMembers =
    settings?.familyMembers && settings.familyMembers.length
      ? settings.familyMembers
      : DEFAULT_SETTINGS.familyMembers;

  const defaultMemberId = familyMembers.some((member) => member.id === settings?.defaultMemberId)
    ? (settings?.defaultMemberId ?? familyMembers[0]?.id ?? DEFAULT_SETTINGS.defaultMemberId)
    : (familyMembers[0]?.id ?? DEFAULT_SETTINGS.defaultMemberId);

  return {
    schemaVersion: settings?.schemaVersion ?? DEFAULT_SETTINGS.schemaVersion,
    familyMembers,
    defaultMemberId,
    quietMode: true
  };
}

function ensureIndexedDb(): void {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available in this environment.");
  }
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
  });
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read blob."));
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl?: string, fallbackMimeType = "image/jpeg"): Promise<Blob> {
  if (!dataUrl) {
    return new Blob([], { type: fallbackMimeType });
  }

  const response = await fetch(dataUrl);
  return response.blob();
}

async function openDatabase(): Promise<IDBDatabase> {
  ensureIndexedDb();

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains("entries")) {
        const store = database.createObjectStore("entries", { keyPath: "id" });
        store.createIndex("memberId", "memberId", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }

      if (!database.objectStoreNames.contains("mediaItems")) {
        const store = database.createObjectStore("mediaItems", { keyPath: "id" });
        store.createIndex("entryId", "entryId", { unique: false });
      }

      if (!database.objectStoreNames.contains("analysisTags")) {
        const store = database.createObjectStore("analysisTags", { keyPath: "id" });
        store.createIndex("entryId", "entryId", { unique: false });
      }

      if (!database.objectStoreNames.contains("weeklyInsights")) {
        const store = database.createObjectStore("weeklyInsights", { keyPath: "id" });
        store.createIndex("weekStart", "weekStart", { unique: false });
      }

      if (!database.objectStoreNames.contains("developerNotes")) {
        const store = database.createObjectStore("developerNotes", { keyPath: "id" });
        store.createIndex("sourceEntryId", "sourceEntryId", { unique: false });
      }

      if (!database.objectStoreNames.contains("settings")) {
        database.createObjectStore("settings", { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB."));
  });
}

async function withTransaction<T>(
  storeNames: StoreName | StoreName[],
  mode: IDBTransactionMode,
  callback: (stores: Partial<Record<StoreName, IDBObjectStore>>) => Promise<T> | T
): Promise<T> {
  const database = await openDatabase();
  const names = Array.isArray(storeNames) ? storeNames : [storeNames];
  const transaction = database.transaction(names, mode);
  const stores: Partial<Record<StoreName, IDBObjectStore>> = {};

  names.forEach((name) => {
    stores[name] = transaction.objectStore(name);
  });

  try {
    const result = await callback(stores);
    await transactionComplete(transaction);
    return result;
  } finally {
    database.close();
  }
}

async function deleteByIndex(
  store: IDBObjectStore,
  indexName: string,
  value: IDBValidKey
): Promise<void> {
  const keys = await requestToPromise(store.index(indexName).getAllKeys(value));
  keys.forEach((key) => {
    store.delete(key);
  });
}

function sortNewestFirst<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export class IndexedDbRepository implements Repository {
  async createEntry(entry: Entry): Promise<Entry> {
    await withTransaction("entries", "readwrite", async (stores) => {
      stores.entries?.put(entry);
    });

    return entry;
  }

  async listEntries(options?: { limit?: number; memberId?: string }): Promise<Entry[]> {
    const entries = await withTransaction("entries", "readonly", (stores) =>
      requestToPromise(stores.entries!.getAll() as IDBRequest<Entry[]>)
    );

    const filtered = options?.memberId
      ? entries.filter((entry) => entry.memberId === options.memberId)
      : entries;

    const sorted = sortNewestFirst(filtered);
    return typeof options?.limit === "number" ? sorted.slice(0, options.limit) : sorted;
  }

  async getEntry(id: string): Promise<Entry | undefined> {
    return withTransaction("entries", "readonly", async (stores) => {
      const result = await requestToPromise(stores.entries!.get(id) as IDBRequest<Entry | undefined>);
      return result ?? undefined;
    });
  }

  async deleteEntry(id: string): Promise<void> {
    await withTransaction(
      ["entries", "mediaItems", "analysisTags", "developerNotes"],
      "readwrite",
      async (stores) => {
        stores.entries?.delete(id);
        await deleteByIndex(stores.mediaItems!, "entryId", id);
        await deleteByIndex(stores.analysisTags!, "entryId", id);
        await deleteByIndex(stores.developerNotes!, "sourceEntryId", id);
      }
    );
  }

  async saveMedia(media: MediaItem): Promise<MediaItem> {
    await withTransaction("mediaItems", "readwrite", async (stores) => {
      stores.mediaItems?.put(media);
    });

    return media;
  }

  async getMedia(id: string): Promise<MediaItem | undefined> {
    return withTransaction("mediaItems", "readonly", async (stores) => {
      const result = await requestToPromise(
        stores.mediaItems!.get(id) as IDBRequest<MediaItem | undefined>
      );
      return result ?? undefined;
    });
  }

  async listMediaByEntry(entryId: string): Promise<MediaItem[]> {
    return withTransaction("mediaItems", "readonly", (stores) =>
      requestToPromise(stores.mediaItems!.index("entryId").getAll(entryId) as IDBRequest<MediaItem[]>)
    );
  }

  async replaceAnalysisTags(entryId: string, tags: AnalysisTag[]): Promise<void> {
    await withTransaction("analysisTags", "readwrite", async (stores) => {
      await deleteByIndex(stores.analysisTags!, "entryId", entryId);
      tags.forEach((tag) => {
        stores.analysisTags?.put(tag);
      });
    });
  }

  async listAnalysisTags(entryIds?: string[]): Promise<AnalysisTag[]> {
    const tags = await withTransaction("analysisTags", "readonly", (stores) =>
      requestToPromise(stores.analysisTags!.getAll() as IDBRequest<AnalysisTag[]>)
    );

    if (!entryIds?.length) {
      return sortNewestFirst(tags);
    }

    const idSet = new Set(entryIds);
    return sortNewestFirst(tags.filter((tag) => idSet.has(tag.entryId)));
  }

  async replaceWeeklyInsights(weekStart: string, insights: WeeklyInsight[]): Promise<void> {
    await withTransaction("weeklyInsights", "readwrite", async (stores) => {
      await deleteByIndex(stores.weeklyInsights!, "weekStart", weekStart);
      insights.forEach((insight) => {
        stores.weeklyInsights?.put(insight);
      });
    });
  }

  async listWeeklyInsights(weekStart?: string): Promise<WeeklyInsight[]> {
    const insights = await withTransaction("weeklyInsights", "readonly", (stores) =>
      requestToPromise(stores.weeklyInsights!.getAll() as IDBRequest<WeeklyInsight[]>)
    );

    const filtered = weekStart
      ? insights.filter((insight) => insight.weekStart === weekStart)
      : insights;

    return [...filtered].sort((left, right) => right.priority - left.priority);
  }

  async createDeveloperNote(note: DeveloperNote): Promise<DeveloperNote> {
    await withTransaction("developerNotes", "readwrite", async (stores) => {
      stores.developerNotes?.put(note);
    });

    return note;
  }

  async replaceDeveloperNotes(notes: DeveloperNote[]): Promise<void> {
    const existing = await this.listDeveloperNotes();
    const statusByEntryId = new Map(existing.map((note) => [note.sourceEntryId, note.status]));

    await withTransaction("developerNotes", "readwrite", async (stores) => {
      stores.developerNotes?.clear();
      notes.forEach((note) => {
        stores.developerNotes?.put({
          ...note,
          status: statusByEntryId.get(note.sourceEntryId) ?? note.status
        });
      });
    });
  }

  async listDeveloperNotes(): Promise<DeveloperNote[]> {
    const notes = await withTransaction("developerNotes", "readonly", (stores) =>
      requestToPromise(stores.developerNotes!.getAll() as IDBRequest<DeveloperNote[]>)
    );

    return sortNewestFirst(notes);
  }

  async getSettings(): Promise<AppSettings> {
    const record = await withTransaction("settings", "readonly", (stores) =>
      requestToPromise(stores.settings!.get(SETTINGS_KEY) as IDBRequest<SettingsRecord | undefined>)
    );

    if (record?.value) {
      return normalizeSettings(record.value);
    }

    await this.updateSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }

  async updateSettings(settings: AppSettings): Promise<AppSettings> {
    const nextSettings = normalizeSettings(settings);

    await withTransaction("settings", "readwrite", async (stores) => {
      stores.settings?.put({ key: SETTINGS_KEY, value: nextSettings } satisfies SettingsRecord);
    });

    return nextSettings;
  }

  async exportAllData(): Promise<ExportDataBundle> {
    const [settings, entries, analysisTags, weeklyInsights, developerNotes, mediaItems] =
      await Promise.all([
        this.getSettings(),
        this.listEntries(),
        this.listAnalysisTags(),
        this.listWeeklyInsights(),
        this.listDeveloperNotes(),
        withTransaction("mediaItems", "readonly", (stores) =>
          requestToPromise(stores.mediaItems!.getAll() as IDBRequest<MediaItem[]>)
        )
      ]);

    const mediaExportItems: MediaExportItem[] = await Promise.all(
      mediaItems.map(async (mediaItem) => ({
        id: mediaItem.id,
        entryId: mediaItem.entryId,
        type: mediaItem.type,
        mimeType: mediaItem.mimeType,
        width: mediaItem.width,
        height: mediaItem.height,
        createdAt: mediaItem.createdAt,
        blobBase64: await blobToDataUrl(mediaItem.blob)
      }))
    );

    return {
      schemaVersion: settings.schemaVersion,
      exportedAt: new Date().toISOString(),
      settings,
      entries,
      mediaItems: mediaExportItems,
      analysisTags,
      weeklyInsights,
      developerNotes
    };
  }

  async importAllData(data: ExportDataBundle): Promise<void> {
    const mediaItems: MediaItem[] = await Promise.all(
      (data.mediaItems ?? []).map(async (mediaItem) => ({
        id: mediaItem.id,
        entryId: mediaItem.entryId,
        type: "image",
        mimeType: mediaItem.mimeType,
        width: mediaItem.width,
        height: mediaItem.height,
        createdAt: mediaItem.createdAt,
        blob: await dataUrlToBlob(mediaItem.blobBase64, mediaItem.mimeType)
      }))
    );

    await this.clearAllData();

    await withTransaction(
      ["entries", "mediaItems", "analysisTags", "weeklyInsights", "developerNotes", "settings"],
      "readwrite",
      async (stores) => {
        (data.entries ?? []).forEach((entry) => stores.entries?.put(entry));
        mediaItems.forEach((mediaItem) => stores.mediaItems?.put(mediaItem));
        (data.analysisTags ?? []).forEach((tag) => stores.analysisTags?.put(tag));
        (data.weeklyInsights ?? []).forEach((insight) => stores.weeklyInsights?.put(insight));
        (data.developerNotes ?? []).forEach((note) => stores.developerNotes?.put(note));
        stores.settings?.put({
          key: SETTINGS_KEY,
          value: normalizeSettings(data.settings)
        } satisfies SettingsRecord);
      }
    );
  }

  async clearAllData(): Promise<void> {
    await withTransaction(
      ["entries", "mediaItems", "analysisTags", "weeklyInsights", "developerNotes", "settings"],
      "readwrite",
      async (stores) => {
        stores.entries?.clear();
        stores.mediaItems?.clear();
        stores.analysisTags?.clear();
        stores.weeklyInsights?.clear();
        stores.developerNotes?.clear();
        stores.settings?.clear();
        stores.settings?.put({ key: SETTINGS_KEY, value: DEFAULT_SETTINGS } satisfies SettingsRecord);
      }
    );
  }
}

export const indexedDbRepository = new IndexedDbRepository();
