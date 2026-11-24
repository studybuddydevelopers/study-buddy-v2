import assert from "node:assert/strict";
import { test } from "node:test";
import { validateE2eDatabaseUrl } from "./prepare-e2e-database.mjs";

test("accepts an explicitly disposable loopback PostgreSQL database", () => {
  const result = validateE2eDatabaseUrl(
    "postgresql://postgres:test@127.0.0.1:55432/studybuddy_e2e"
  );

  assert.equal(result.databaseName, "studybuddy_e2e");
  assert.equal(result.url.hostname, "127.0.0.1");
});

test("rejects a database that is not on a loopback host", () => {
  const remoteDatabaseUrl = new URL(
    "postgresql://database.example/studybuddy_e2e"
  );
  remoteDatabaseUrl.username = "postgres";
  remoteDatabaseUrl.password = "test";

  assert.throws(
    () => validateE2eDatabaseUrl(remoteDatabaseUrl.toString()),
    /loopback host/
  );
});

test("rejects a loopback database without the disposable suffix", () => {
  assert.throws(
    () =>
      validateE2eDatabaseUrl(
        "postgresql://postgres:test@127.0.0.1:55432/studybuddy"
      ),
    /must end in _e2e/
  );
});

test("rejects non-PostgreSQL URLs", () => {
  assert.throws(
    () => validateE2eDatabaseUrl("https://127.0.0.1/studybuddy_e2e"),
    /must use PostgreSQL/
  );
});
