import { describe, expect, it } from "vitest";
import { validateRetrievalFilters } from "./filters";

describe("retrieval filter validation", () => {
  it("allows no subject and no topic", async () => {
    await expect(validateRetrievalFilters(fakePrisma(), {})).resolves.toBeUndefined();
  });

  it("allows a subject without a topic", async () => {
    await expect(
      validateRetrievalFilters(fakePrisma(), { subjectId: "subject-1" })
    ).resolves.toBeUndefined();
  });

  it("rejects a topic without a subject", async () => {
    await expect(
      validateRetrievalFilters(fakePrisma(), { topicId: "topic-1" })
    ).rejects.toMatchObject({ code: "INVALID_SUBJECT_TOPIC" });
  });

  it("rejects a topic from another subject", async () => {
    await expect(
      validateRetrievalFilters(fakePrisma(), {
        subjectId: "subject-2",
        topicId: "topic-1",
      })
    ).rejects.toMatchObject({ code: "INVALID_SUBJECT_TOPIC" });
  });
});

function fakePrisma() {
  return {
    subject: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === "subject-1" || where.id === "subject-2"
          ? { id: where.id }
          : null,
    },
    topic: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === "topic-1"
          ? { id: "topic-1", subjectId: "subject-1" }
          : null,
    },
  };
}
