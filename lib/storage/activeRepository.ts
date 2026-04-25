import { apiRepository } from "@/lib/storage/apiRepository";
import { indexedDbRepository } from "@/lib/storage/indexedDbRepository";
import type { Repository } from "@/lib/storage/repository";

export type ClientStorageMode = "local" | "cloud";

export function getClientStorageMode(): ClientStorageMode {
  return process.env.NEXT_PUBLIC_STORAGE_MODE === "cloud" ? "cloud" : "local";
}

export function isCloudStorageMode(): boolean {
  return getClientStorageMode() === "cloud";
}

export function createActiveRepository(): Repository {
  return isCloudStorageMode() ? apiRepository : indexedDbRepository;
}

export const activeRepository = createActiveRepository();
