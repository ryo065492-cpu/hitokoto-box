import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiRepository } from "../lib/storage/apiRepository";
import { createActiveRepository, getClientStorageMode } from "../lib/storage/activeRepository";
import { IndexedDbRepository } from "../lib/storage/indexedDbRepository";

describe("active repository selection", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses IndexedDB in local mode", () => {
    vi.stubEnv("NEXT_PUBLIC_STORAGE_MODE", "local");

    expect(getClientStorageMode()).toBe("local");
    expect(createActiveRepository()).toBeInstanceOf(IndexedDbRepository);
  });

  it("uses ApiRepository in cloud mode", () => {
    vi.stubEnv("NEXT_PUBLIC_STORAGE_MODE", "cloud");

    expect(getClientStorageMode()).toBe("cloud");
    expect(createActiveRepository()).toBeInstanceOf(ApiRepository);
  });

  it("falls back to local mode when storage mode is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_STORAGE_MODE", "");

    expect(getClientStorageMode()).toBe("local");
    expect(createActiveRepository()).toBeInstanceOf(IndexedDbRepository);
  });
});
