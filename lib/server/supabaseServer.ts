export interface ServerSupabaseConfig {
  url: string;
  serviceRoleKey: string;
}

export function getServerSupabaseConfig(): ServerSupabaseConfig | undefined {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    return undefined;
  }

  return { url, serviceRoleKey };
}

export function isServerSupabaseConfigured(): boolean {
  return Boolean(getServerSupabaseConfig());
}

export function requireServerSupabaseConfig(): ServerSupabaseConfig {
  const config = getServerSupabaseConfig();

  if (!config) {
    throw new Error("Supabase server environment variables are not configured.");
  }

  return config;
}
