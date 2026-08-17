import { describe, expect, it } from "vitest";
import {
  buildOpenAIStructuredChatRequest,
  parseOpenAIStructuredChatCompletion,
} from "./openai-provider";
import { capabilityGroundedTeachOutputSchema } from "../grounding/pipelines/capability-grounding-pipeline";

describe("OpenAI structured chat adapter contract", () => {
  it("serializes the same strict json_schema request shape used by the adapter", () => {
    assertStrictSchemaPropertiesAreRequired(
      capabilityGroundedTeachOutputSchema.schema
    );

    const request = buildOpenAIStructuredChatRequest(
      {
        messages: [{ role: "user", content: "What is momentum?" }],
        temperature: 0.2,
        maxOutputTokens: 700,
        outputSchema: capabilityGroundedTeachOutputSchema,
      },
      "gpt-4o-mini"
    );

    expect(JSON.parse(JSON.stringify(request))).toMatchObject({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 700,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "capability_grounded_teach_response",
          strict: true,
        },
      },
    });
  });

  it("parses a valid structured response without a network call", () => {
    const result = parseOpenAIStructuredChatCompletion(
      {
        choices: [
          {
            message: {
              content: JSON.stringify({
                answerSegments: [
                  {
                    text: "Momentum depends on mass and velocity.",
                    sourceLabels: ["SOURCE_1"],
                  },
                ],
                insufficientContext: false,
                suggestedQuestions: [],
              }),
            },
          },
        ],
        usage: {
          prompt_tokens: 11,
          completion_tokens: 7,
          total_tokens: 18,
        },
      },
      "gpt-4o-mini"
    );

    expect(result).toMatchObject({
      provider: "openai",
      model: "gpt-4o-mini",
      value: {
        answerSegments: [
          {
            text: "Momentum depends on mass and velocity.",
            sourceLabels: ["SOURCE_1"],
          },
        ],
        insufficientContext: false,
        suggestedQuestions: [],
      },
      usage: {
        inputTokens: 11,
        outputTokens: 7,
        totalTokens: 18,
      },
    });
  });

  it("fails cleanly when the provider returns non-json content", () => {
    expect(() =>
      parseOpenAIStructuredChatCompletion(
        {
          choices: [{ message: { content: "not json" } }],
        },
        "gpt-4o-mini"
      )
    ).toThrow(SyntaxError);
  });
});

function assertStrictSchemaPropertiesAreRequired(schema: unknown) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return;
  const record = schema as Record<string, unknown>;

  if (record.type === "object" && isRecord(record.properties)) {
    const propertyNames = Object.keys(record.properties);
    expect(record.additionalProperties).toBe(false);
    expect(new Set(record.required as string[])).toEqual(new Set(propertyNames));

    for (const value of Object.values(record.properties)) {
      assertStrictSchemaPropertiesAreRequired(value);
    }
  }

  if (record.type === "array") {
    assertStrictSchemaPropertiesAreRequired(record.items);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
