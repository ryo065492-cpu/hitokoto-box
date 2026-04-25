import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, type Entry, type MediaItem } from "../domain/types";
import {
  captureEntryWithDependencies,
  type CaptureEntryDependencies
} from "../lib/services/appService";

function createFakeDependencies(
  overrides: Partial<CaptureEntryDependencies> = {}
): CaptureEntryDependencies & { entries: Entry[]; mediaItems: MediaItem[] } {
  const entries: Entry[] = [];
  const mediaItems: MediaItem[] = [];
  let idCount = 0;

  const dependencies: CaptureEntryDependencies & {
    entries: Entry[];
    mediaItems: MediaItem[];
  } = {
    entries,
    mediaItems,
    repository: {
      async getSettings() {
        return DEFAULT_SETTINGS;
      },
      async createEntry(entry) {
        const index = entries.findIndex((current) => current.id === entry.id);

        if (index >= 0) {
          entries[index] = entry;
        } else {
          entries.push(entry);
        }

        return entry;
      },
      async deleteEntry(id) {
        const index = entries.findIndex((entry) => entry.id === id);

        if (index >= 0) {
          entries.splice(index, 1);
        }
      },
      async saveMedia(media) {
        mediaItems.push(media);
        return media;
      }
    },
    async compressImage() {
      return {
        blob: new Blob(["compressed"], { type: "image/jpeg" }),
        mimeType: "image/jpeg",
        width: 100,
        height: 80
      };
    },
    async refreshDerivedData() {
      return undefined;
    },
    createId(prefix) {
      idCount += 1;
      return `${prefix}-${idCount}`;
    },
    now() {
      return new Date("2026-04-25T00:00:00.000Z");
    },
    ...overrides
  };

  return dependencies;
}

describe("captureEntry", () => {
  it("keeps Entry.text when attachment compression fails", async () => {
    const dependencies = createFakeDependencies({
      async compressImage() {
        throw new Error("compression failed");
      }
    });

    const result = await captureEntryWithDependencies(
      {
        text: "写真もあるけど、まずこのひとことを残したい",
        files: [new File(["image"], "photo.jpg", { type: "image/jpeg" })],
        usedVoiceInput: false
      },
      dependencies
    );

    expect(result.mediaStatus).toBe("failed");
    expect(result.entry.text).toBe("写真もあるけど、まずこのひとことを残したい");
    expect(result.entry.mediaIds).toEqual([]);
    expect(dependencies.entries).toHaveLength(1);
    expect(dependencies.entries[0]?.text).toBe("写真もあるけど、まずこのひとことを残したい");
  });

  it("saves a text-only entry without attachment work", async () => {
    const dependencies = createFakeDependencies();

    const result = await captureEntryWithDependencies(
      {
        text: "テキストだけ残す",
        files: [],
        usedVoiceInput: false
      },
      dependencies
    );

    expect(result.mediaStatus).toBe("none");
    expect(result.entry.text).toBe("テキストだけ残す");
    expect(result.entry.mediaIds).toEqual([]);
    expect(dependencies.mediaItems).toHaveLength(0);
  });
});
