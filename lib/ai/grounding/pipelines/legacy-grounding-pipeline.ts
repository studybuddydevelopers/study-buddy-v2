import { GroundedGenerationService } from "../grounded-generation-service";
import type {
  CapabilityPipelineOptions,
  GroundingPipeline,
  GroundingPipelineContext,
} from "./types";

export class LegacyGroundingPipeline implements GroundingPipeline {
  private readonly service: GroundedGenerationService;

  constructor(optionsOrService: CapabilityPipelineOptions | GroundedGenerationService = {}) {
    this.service =
      optionsOrService instanceof GroundedGenerationService
        ? optionsOrService
        : new GroundedGenerationService(optionsOrService);
  }

  generate(input: Parameters<GroundingPipeline["generate"]>[0]) {
    return this.service.generate({
      context: input.context as GroundingPipelineContext,
      provider: input.provider,
    });
  }
}
