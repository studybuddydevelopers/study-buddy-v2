import { RetrievalError } from "./errors";
import type { RetrievalFilters } from "./types";

interface SubjectTopicLookup {
  subject: {
    findUnique(input: {
      where: { id: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
  };
  topic: {
    findUnique(input: {
      where: { id: string };
      select: { id: true; subjectId: true };
    }): Promise<{ id: string; subjectId: string } | null>;
  };
}

export async function validateRetrievalFilters(
  prisma: SubjectTopicLookup,
  filters: RetrievalFilters | undefined
) {
  if (!filters) return;

  if (filters.topicId && !filters.subjectId) {
    throw new RetrievalError(
      "INVALID_SUBJECT_TOPIC",
      "A topic filter cannot be used without a subject filter."
    );
  }

  if (filters.subjectId) {
    const subject = await prisma.subject.findUnique({
      where: { id: filters.subjectId },
      select: { id: true },
    });
    if (!subject) {
      throw new RetrievalError("INVALID_SUBJECT_TOPIC", "Subject not found.");
    }
  }

  if (filters.topicId) {
    const topic = await prisma.topic.findUnique({
      where: { id: filters.topicId },
      select: { id: true, subjectId: true },
    });
    if (!topic || topic.subjectId !== filters.subjectId) {
      throw new RetrievalError(
        "INVALID_SUBJECT_TOPIC",
        "Topic must belong to the selected subject."
      );
    }
  }
}

export function boundedLimit(
  value: number | undefined,
  fallback: number,
  maximum: number
) {
  if (!value || !Number.isInteger(value) || value < 1) return fallback;
  return Math.min(value, maximum);
}
