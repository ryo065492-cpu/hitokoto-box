import type { AmmoItemStatus, AmmoStatus } from "@/lib/arsenal/ammo";
import { requireServerSupabaseConfig, type ServerSupabaseConfig } from "@/lib/server/supabaseServer";

type AmmoStatusRow = {
  id: string;
  ammo_key: string;
  source_entry_ids: unknown;
  title: string;
  status: string;
  note: string | null;
  updated_at: string;
  created_at: string;
};

export interface SaveAmmoStatusInput {
  ammoKey: string;
  sourceEntryIds: string[];
  title: string;
  status: AmmoStatus;
  note?: string;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toAmmoStatus(value: string): AmmoStatus {
  if (value === "selected" || value === "parked" || value === "ignored" || value === "done") {
    return value;
  }

  return "candidate";
}

function toStatus(row: AmmoStatusRow): AmmoItemStatus {
  return {
    id: row.id,
    ammoKey: row.ammo_key,
    sourceEntryIds: toStringArray(row.source_entry_ids),
    title: row.title,
    status: toAmmoStatus(row.status),
    note: row.note ?? undefined,
    updatedAt: row.updated_at
  };
}

async function ensureOk(response: Response): Promise<Response> {
  if (response.ok) {
    return response;
  }

  const body = await response.text();
  throw new Error(body || `Supabase request failed: ${response.status}`);
}

export class ServerAmmoStatusRepository {
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

  async listStatuses(): Promise<AmmoItemStatus[]> {
    const rows = await this.request<AmmoStatusRow[]>("/ammo_item_statuses?select=*&order=updated_at.desc");
    return rows.map(toStatus);
  }

  async upsertStatus(input: SaveAmmoStatusInput): Promise<AmmoItemStatus> {
    const rows = await this.request<AmmoStatusRow[]>("/ammo_item_statuses?on_conflict=ammo_key", {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify({
        ammo_key: input.ammoKey,
        source_entry_ids: input.sourceEntryIds,
        title: input.title,
        status: input.status,
        note: input.note ?? null,
        updated_at: new Date().toISOString()
      })
    });

    if (!rows[0]) {
      throw new Error("Supabase did not return the saved ammo status.");
    }

    return toStatus(rows[0]);
  }

  async updateStatus(ammoKey: string, status: AmmoStatus): Promise<AmmoItemStatus | undefined> {
    const rows = await this.request<AmmoStatusRow[]>(
      `/ammo_item_statuses?ammo_key=eq.${encodeURIComponent(ammoKey)}`,
      {
        method: "PATCH",
        headers: {
          Prefer: "return=representation"
        },
        body: JSON.stringify({
          status,
          updated_at: new Date().toISOString()
        })
      }
    );

    return rows[0] ? toStatus(rows[0]) : undefined;
  }
}

export function createServerAmmoStatusRepository(): ServerAmmoStatusRepository {
  return new ServerAmmoStatusRepository();
}
