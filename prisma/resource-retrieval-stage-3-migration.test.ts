import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Stage 3 retrieval migration", () => {
  const migration = fs.readFileSync(
    path.resolve(
      __dirname,
      "migrations/20260729140000_add_resource_retrieval_stage_3/migration.sql"
    ),
    "utf8"
  );
  const selectedMetadataMigration = fs.readFileSync(
    path.resolve(
      __dirname,
      "migrations/20260729141000_stage_3_search_text_selected_metadata/migration.sql"
    ),
    "utf8"
  );

  it("installs pgvector in the inspected Supabase extensions schema", () => {
    expect(migration).toMatch(/CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions/);
    expect(migration).toMatch(/"embedding" extensions\.vector\(1536\)/);
  });

  it("does not install pg_trgm or approximate vector indexes in Stage 3", () => {
    expect(migration).not.toMatch(/CREATE EXTENSION IF NOT EXISTS pg_trgm/i);
    expect(migration).not.toMatch(/\bHNSW\b|\bIVFFLAT\b/i);
  });

  it("uses chunk-local FTS and a GIN index", () => {
    expect(migration).toMatch(/ADD COLUMN "searchText" TEXT/);
    expect(migration).toMatch(/ADD COLUMN "searchVector" tsvector/);
    expect(migration).toMatch(/USING GIN \("searchVector"\)/);
    expect(migration).not.toMatch(/GENERATED ALWAYS AS \([^;]*"Resource"/s);
  });

  it("keeps only one active embedding configuration", () => {
    expect(migration).toMatch(
      /CREATE UNIQUE INDEX "ResourceEmbeddingConfiguration_single_active_idx"/
    );
    expect(migration).toMatch(/WHERE "status" = 'ACTIVE'/);
  });

  it("corrects search text to selected metadata fields only", () => {
    expect(selectedMetadataMigration).toMatch(/jsonb_extract_path_text/);
    expect(selectedMetadataMigration).not.toMatch(/"metadata"::text/);
  });
});
