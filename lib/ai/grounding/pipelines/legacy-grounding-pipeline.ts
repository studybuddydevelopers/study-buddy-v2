import { GroundedGenerationService } from "../grounded-generation-service";
import type {
  GroundingPipeline,
  GroundingPipelineContext,
} from "./types";

export class LegacyGroundingPipeline implements GroundingPipeline {
  constructor(private readonly service = new GroundedGenerationService()) {}

  generate(input: Parameters<GroundingPipeline["generate"]>[0]) {
    return this.service.generate({
      context: input.context as GroundingPipelineContext,
      provider: input.provider,
    });
  }
}
