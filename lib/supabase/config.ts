export class SupabasePublicConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabasePublicConfigError";
  }
}

interface ResolvedSupabasePublicConfig {
  url: string;
  key: string;
  urlSource: string;
  keySource: string;
}

function firstPresent(candidates: Array<[string, string | undefined]>) {
  for (const [source, value] of candidates) {
    if (typeof value === "string" && value.trim()) {
      return { source, value: value.trim() };
    }
  }

  return null;
}

function missingConfig(message: string): never {
  throw new SupabasePublicConfigError(message);
}

export function getBrowserSupabaseConfig(): ResolvedSupabasePublicConfig {
  const url = firstPresent([
    ["NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL],
  ]);
  const key = firstPresent([
    [
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY],
  ]);

  if (!url) {
    missingConfig("Missing Supabase browser URL configuration.");
  }
  if (!key) {
    missingConfig("Missing Supabase browser public key configuration.");
  }

  return {
    url: url.value,
    key: key.value,
    urlSource: url.source,
    keySource: key.source,
  };
}

export function getServerSupabaseConfig(): ResolvedSupabasePublicConfig {
  const url = firstPresent([
    ["SUPABASE_URL", process.env.SUPABASE_URL],
    ["NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL],
  ]);
  const key = firstPresent([
    ["SUPABASE_PUBLISHABLE_KEY", process.env.SUPABASE_PUBLISHABLE_KEY],
    [
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ],
    ["SUPABASE_ANON_KEY", process.env.SUPABASE_ANON_KEY],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY],
  ]);

  if (!url) {
    missingConfig("Missing Supabase server URL configuration.");
  }
  if (!key) {
    missingConfig("Missing Supabase server public key configuration.");
  }

  return {
    url: url.value,
    key: key.value,
    urlSource: url.source,
    keySource: key.source,
  };
}
