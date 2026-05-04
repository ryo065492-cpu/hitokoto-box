import type { AmmoCard, AmmoItemStatus, AmmoStatus } from "@/lib/arsenal/ammo";

export const AMMO_STATUS_STORAGE_KEY = "hitokoto-bako:ammo-statuses";
export type AmmoStatusMap = Record<string, AmmoItemStatus>;

function normalizeStatus(value: unknown): AmmoStatus {
  if (value === "selected" || value === "parked" || value === "ignored" || value === "done") {
    return value;
  }

  if (value === "next" || value === "doing") {
    return "selected";
  }

  return "candidate";
}

export function readAmmoStatuses(storage?: Storage): AmmoStatusMap {
  if (!storage) {
    return {};
  }

  const raw = storage.getItem(AMMO_STATUS_STORAGE_KEY);

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, Partial<AmmoItemStatus>>;

    return Object.fromEntries(
      Object.entries(parsed).map(([id, value]) => [
        id,
        {
          id: value.id ?? id,
          ammoKey: value.ammoKey ?? id,
          sourceEntryIds: Array.isArray(value.sourceEntryIds) ? value.sourceEntryIds : [],
          title: value.title ?? "",
          status: normalizeStatus(value.status),
          note: value.note,
          updatedAt: value.updatedAt ?? new Date(0).toISOString()
        }
      ])
    );
  } catch {
    return {};
  }
}

export function writeAmmoStatuses(storage: Storage | undefined, statuses: AmmoStatusMap): void {
  storage?.setItem(AMMO_STATUS_STORAGE_KEY, JSON.stringify(statuses));
}

export function toAmmoStatusMap(statuses: AmmoItemStatus[]): AmmoStatusMap {
  return Object.fromEntries(statuses.map((status) => [status.ammoKey, status]));
}

export function updateAmmoStatus(
  current: AmmoStatusMap,
  card: AmmoCard,
  status: AmmoStatus,
  now = new Date()
): AmmoStatusMap {
  return {
    ...current,
    [card.ammoKey]: {
      id: card.id,
      ammoKey: card.ammoKey,
      sourceEntryIds: card.sourceEntryIds,
      title: card.title,
      status,
      updatedAt: now.toISOString()
    }
  };
}
