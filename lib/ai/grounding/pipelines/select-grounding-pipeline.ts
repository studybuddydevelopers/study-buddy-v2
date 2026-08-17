import {
  getSelectedGroundingPipeline,
  resolveGroundingPipelineKind,
  type GroundingPipelineKind,
} from "../config";
import { CapabilityGroundingPipeline } from "./capability-grounding-pipeline";
import { LegacyGroundingPipeline } from "./legacy-grounding-pipeline";
import type { CapabilityPipelineOptions, GroundingPipeline } from "./types";

export function selectGroundingPipeline(
  options: CapabilityPipelineOptions = {},
  selected?: GroundingPipelineKind
): GroundingPipeline {
  const pipeline = selected
    ? resolveGroundingPipelineKind(selected)
    : getSelectedGroundingPipeline();

  return pipeline === "capability"
    ? new CapabilityGroundingPipeline(options)
    : new LegacyGroundingPipeline(options);
}
