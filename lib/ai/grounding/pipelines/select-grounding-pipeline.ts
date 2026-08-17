import { getSelectedGroundingPipeline } from "../config";
import { CapabilityGroundingPipeline } from "./capability-grounding-pipeline";
import { LegacyGroundingPipeline } from "./legacy-grounding-pipeline";
import type { CapabilityPipelineOptions, GroundingPipeline } from "./types";

export function selectGroundingPipeline(
  options: CapabilityPipelineOptions = {}
): GroundingPipeline {
  return getSelectedGroundingPipeline() === "capability"
    ? new CapabilityGroundingPipeline(options)
    : new LegacyGroundingPipeline();
}
