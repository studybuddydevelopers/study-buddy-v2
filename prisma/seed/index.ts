import { PrismaClient } from "@prisma/client";
import { subjects } from "./subjects";
import { topicsBySubject } from "./topics";
import { questions } from "./questions";
import { mockTemplates } from "./mockTemplates";

const prisma = new PrismaClient();

async function main() {
  // 1) Subjects
  await prisma.subject.createMany({ data: subjects, skipDuplicates: true });

  // Map subject names → ids
  const subjectMap = new Map(
    (await prisma.subject.findMany({ select: { id: true, name: true } }))
      .map(({ id, name }) => [name, id] as const)
  );

  // 2) Topics per subject
  for (const [subjectName, topicList] of Object.entries(topicsBySubject)) {
    const subjectId = subjectMap.get(subjectName);
    if (!subjectId) continue;
    await prisma.topic.createMany({
      data: topicList.map((title) => ({ title, subjectId })),
      skipDuplicates: true,
    });
  }

  // Map topic titles → ids
  const topicMap = new Map(
    (await prisma.topic.findMany({ select: { id: true, title: true } }))
      .map(({ id, title }) => [title, id] as const)
  );

  // 3) SAT-style questions
  const resolvedQuestions = questions
    .map((q) => {
      const subjectId = subjectMap.get(q.subjectName);
      const topicId = topicMap.get(q.topicTitle);
      if (!subjectId || !topicId) return null;
      return {
        subjectId,
        topicId,
        questionText: q.questionText,
        questionImageUrl: q.questionImageUrl ?? null,
        answerText: q.answerText,
        explanationText: q.explanationText ?? null,
        year: q.year ?? null,
        questionNumber: q.questionNumber ?? null,
        difficulty: q.difficulty ?? null,
      };
    })
    .filter((q): q is NonNullable<typeof q> => Boolean(q));

  if (resolvedQuestions.length) {
    await prisma.pastQuestion.createMany({ data: resolvedQuestions, skipDuplicates: true });
  }

  // 4) Mock exam templates
  const resolvedTemplates = mockTemplates
    .map((m) => {
      const subjectId = subjectMap.get(m.subjectName);
      if (!subjectId) return null;
      return {
        subjectId,
        title: m.title,
        description: m.description ?? null,
        questionCount: m.questionCount,
      };
    })
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  if (resolvedTemplates.length) {
    await prisma.mockExamTemplate.createMany({ data: resolvedTemplates, skipDuplicates: true });
  }

  console.log("SAT seed completed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
