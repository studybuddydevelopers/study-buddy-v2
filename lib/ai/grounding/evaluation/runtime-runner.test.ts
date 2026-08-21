import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resolveRuntimeGroundingPipelineKind,
  runRuntimeGroundedEvaluationPreflight,
} from "./runtime-runner";
import { getSelectedGroundingPipeline, isGroundedChatEnabled } from "../config";
import {
  STAGE41_CAPABILITY_BEHAVIOR_FILE_PATHS,
  STAGE41_CAPABILITY_BEHAVIOR_HASH_ALGORITHM,
} from "./stage41-behavior";

describe("Stage 4.1 evaluator pipeline selection", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults evaluator runs to legacy independently of ambient app selector", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("AI_GROUNDING_PIPELINE", "capability");
    vi.stubEnv("AI_GROUNDED_CHAT_ENABLED", "false");

    expect(getSelectedGroundingPipeline()).toBe("capability");
    expect(resolveRuntimeGroundingPipelineKind()).toBe("legacy");

    const preflight = await runRuntimeGroundedEvaluationPreflight({
      split: "development",
      maxCases: 1,
    });

    expect(preflight.pipeline).toBe("legacy");
    expect(preflight.frozenConfig.pipeline).toBe("legacy");
    expect(preflight.providerCalls).toBe(0);
    expect(preflight.dbMutations).toBe(0);
    expect(isGroundedChatEnabled()).toBe(false);
  });

  it("records explicit capability evaluator selection without enabling app traffic", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("AI_GROUNDING_PIPELINE", "legacy");
    vi.stubEnv("AI_GROUNDED_CHAT_ENABLED", "false");

    const preflight = await runRuntimeGroundedEvaluationPreflight({
      split: "development",
      pipeline: "capability",
      providerLabel: "fake",
      providerModelLabel: "fake-chat-model",
      embeddingProviderLabel: "fake",
      embeddingModelLabel: "fake-embedding-model",
      embeddingDimensionsLabel: 1536,
      maxCases: 1,
    });

    expect(preflight.pipeline).toBe("capability");
    expect(preflight.frozenConfig.pipeline).toBe("capability");
    expect(preflight.frozenConfig.capabilityGroundingVersion).toBe(
      "stage4.1-capability-grounding-v1"
    );
    expect(preflight.frozenConfig.chatProvider).toBe("fake");
    expect(preflight.frozenConfig.embeddingProvider).toBe("fake");
    expect(preflight.providerCalls).toBe(0);
    expect(preflight.dbMutations).toBe(0);
    expect(isGroundedChatEnabled()).toBe(false);
  });

  it("forces capability selection back to legacy in production", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(resolveRuntimeGroundingPipelineKind("capability")).toBe("legacy");
  });

  it("does not create holdout acceptance markers for disclosed capability preflight", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const reportDir = await mkdtemp(path.join(os.tmpdir(), "stage41-e1-markers-"));

    try {
      await runRuntimeGroundedEvaluationPreflight({
        split: "development",
        pipeline: "capability",
        maxCases: 1,
        reportDir,
      });

      expect(await readdir(reportDir)).toEqual([]);
    } finally {
      await rm(reportDir, { recursive: true, force: true });
    }
  });

  it("defines a capability-specific behavior hash surface", () => {
    expect(STAGE41_CAPABILITY_BEHAVIOR_HASH_ALGORITHM).toBe(
      "sha256:path-nul-utf8-nul-v1"
    );
    expect(STAGE41_CAPABILITY_BEHAVIOR_FILE_PATHS).toContain(
      "lib/ai/grounding/requirements/request-requirement-extractor.ts"
    );
    expect(STAGE41_CAPABILITY_BEHAVIOR_FILE_PATHS).toContain(
      "lib/ai/grounding/capabilities/evidence-capability-extractor.ts"
    );
    expect(STAGE41_CAPABILITY_BEHAVIOR_FILE_PATHS).toContain(
      "lib/ai/grounding/answerability/answerability-decider.ts"
    );
    expect(STAGE41_CAPABILITY_BEHAVIOR_FILE_PATHS).toContain(
      "lib/ai/grounding/evidence-units/validated-evidence-unit.ts"
    );
    expect(STAGE41_CAPABILITY_BEHAVIOR_FILE_PATHS).toContain(
      "lib/ai/grounding/validation/narrow-grounding-validator.ts"
    );
    expect(STAGE41_CAPABILITY_BEHAVIOR_FILE_PATHS).not.toContain(
      "lib/ai/grounding/evaluation/fixtures.ts"
    );
    expect(STAGE41_CAPABILITY_BEHAVIOR_FILE_PATHS).not.toContain(
      "lib/ai/grounding/evaluation/holdout-v6.ts"
    );
  });
});
