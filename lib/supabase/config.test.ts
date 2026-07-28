import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getBrowserSupabaseConfig,
  getServerSupabaseConfig,
  SupabasePublicConfigError,
} from "./config";

const ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

let previousEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>;

beforeEach(() => {
  previousEnv = {};
  for (const key of ENV_KEYS) {
    previousEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = previousEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("Supabase public configuration", () => {
  it("resolves the server ordinary auth client from SUPABASE_PUBLISHABLE_KEY", () => {
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_PUBLISHABLE_KEY = "publishable-server-key";

    const config = getServerSupabaseConfig();

    expect(config).toMatchObject({
      url: "https://project.supabase.co",
      key: "publishable-server-key",
      keySource: "SUPABASE_PUBLISHABLE_KEY",
    });
  });

  it("prefers a publishable key over a stale legacy anon key for server auth", () => {
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_PUBLISHABLE_KEY = "valid-publishable-key";
    process.env.SUPABASE_ANON_KEY = "stale-legacy-anon-key";

    const config = getServerSupabaseConfig();

    expect(config.key).toBe("valid-publishable-key");
    expect(config.keySource).toBe("SUPABASE_PUBLISHABLE_KEY");
  });

  it("does not use secret or service-role keys for ordinary server auth", () => {
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "secret-admin-value";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-admin-value";

    expect(() => getServerSupabaseConfig()).toThrow(SupabasePublicConfigError);
  });

  it("fails safely when public-key configuration is missing", () => {
    process.env.SUPABASE_URL = "https://project.supabase.co";

    expect(() => getServerSupabaseConfig()).toThrow(
      "Missing Supabase server public key configuration."
    );
  });

  it("does not include key values in configuration errors", () => {
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "secret-admin-value";

    try {
      getServerSupabaseConfig();
      throw new Error("Expected config lookup to fail.");
    } catch (error) {
      expect(String((error as Error).message)).not.toContain(
        "secret-admin-value"
      );
    }
  });

  it("keeps the legacy browser anon-key configuration functional", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "legacy-browser-anon-key";

    const config = getBrowserSupabaseConfig();

    expect(config).toMatchObject({
      url: "https://project.supabase.co",
      key: "legacy-browser-anon-key",
      keySource: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    });
  });

  it("prefers the browser publishable key over the legacy browser anon key", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      "browser-publishable-key";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "legacy-browser-anon-key";

    const config = getBrowserSupabaseConfig();

    expect(config.key).toBe("browser-publishable-key");
    expect(config.keySource).toBe("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  });

  it("keeps ordinary auth client files on the shared public-key resolver", () => {
    const checkedFiles = [
      "middleware.ts",
      "lib/auth.ts",
      "lib/getSession.ts",
      "lib/supabaseClient.ts",
      "app/api/v1/login/route.ts",
      "app/api/v1/signup/route.ts",
      "app/api/v1/logout/route.ts",
      "app/api/v1/reset-password/route.ts",
    ];

    for (const file of checkedFiles) {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source).not.toMatch(
        /process\.env\.(SUPABASE_ANON_KEY|NEXT_PUBLIC_SUPABASE_ANON_KEY)/
      );
      expect(source).not.toMatch(
        /process\.env\.(SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY)/
      );
    }
  });
});
