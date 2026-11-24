import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { resolveDatabaseSecurityConfig } from "./run-database-security-gate.mjs";

test("derives isolated runtime, maintenance, and shadow URLs", () => {
  const config = resolveDatabaseSecurityConfig(
    "postgresql://postgres:test@127.0.0.1:55432/studybuddy_security_e2e"
  );

  assert.equal(config.databaseName, "studybuddy_security_e2e");
  assert.equal(config.shadowDatabaseName, "studybuddy_security_shadow_e2e");
  assert.equal(new URL(config.maintenanceUrl).pathname, "/postgres");
  assert.equal(new URL(config.runtimeUrl).username, "studybuddy_runtime");
  assert.equal(new URL(config.shadowUrl).hostname, "127.0.0.1");
});

test("rejects a shadow database as the primary destructive target", () => {
  assert.throws(
    () =>
      resolveDatabaseSecurityConfig(
        "postgresql://postgres:test@127.0.0.1:55432/studybuddy_shadow_e2e"
      ),
    /cannot be a shadow database/
  );
});

test("inherits the loopback-only and disposable-name safety boundary", () => {
  const remoteUrl = new URL("postgresql://database.example/studybuddy_security_e2e");
  remoteUrl.username = "postgres";
  remoteUrl.password = "test";

  assert.throws(
    () => resolveDatabaseSecurityConfig(remoteUrl.toString()),
    /loopback host/
  );
  assert.throws(
    () =>
      resolveDatabaseSecurityConfig(
        "postgresql://postgres:test@127.0.0.1:55432/studybuddy_security"
      ),
    /must end in _e2e/
  );
});

test("runtime-role provisioning grants CONNECT to the current database", async () => {
  const sql = await readFile("scripts/provision-runtime-role.sql", "utf8");

  assert.match(sql, /current_database\(\)/);
  assert.doesNotMatch(sql, /GRANT CONNECT ON DATABASE postgres/);
});
