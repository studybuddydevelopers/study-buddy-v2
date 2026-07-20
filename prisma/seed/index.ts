import { PrismaClient } from "@prisma/client";
import { subjects } from "./subjects";
import { topicsBySubject } from "./topics";
import { questions } from "./questions";
import { mockTemplates } from "./mockTemplates";

const prisma = new PrismaClient();

const SAT_EXAM_CODES = ["SAT-MATH", "SAT-READ", "SAT-WRIT"];

async function main() {
  // 0) Remove legacy SAT subjects (and their cascaded topics, questions, templates)
  const satSubjects = await prisma.subject.findMany({
    where: { examCode: { in: SAT_EXAM_CODES } },
    select: { id: true, name: true },
  });
  if (satSubjects.length > 0) {
    console.log(`Removing ${satSubjects.length} legacy SAT subject(s): ${satSubjects.map((s) => s.name).join(", ")}`);
    await prisma.subject.deleteMany({ where: { examCode: { in: SAT_EXAM_CODES } } });
  }

  // 1) Subjects (avoid duplicates by name)
  const existingSubjects = new Set(
    (await prisma.subject.findMany({ select: { name: true } })).map((s) => s.name)
  );
  const newSubjects = subjects.filter((s) => !existingSubjects.has(s.name));
  if (newSubjects.length) {
    await prisma.subject.createMany({ data: newSubjects });
  }

  // Map subject names → ids
  const subjectMap = new Map(
    (await prisma.subject.findMany({ select: { id: true, name: true } }))
      .map(({ id, name }) => [name, id] as const)
  );

  // 2) Topics per subject
  const existingTopicKeys = new Set(
    (await prisma.topic.findMany({ select: { title: true, subjectId: true } }))
      .map(({ title, subjectId }) => `${subjectId}::${title}`)
  );
  for (const [subjectName, topicList] of Object.entries(topicsBySubject)) {
    const subjectId = subjectMap.get(subjectName);
    if (!subjectId) continue;
    const newTopics = topicList
      .map(({ title, sortOrder }) => ({ title, subjectId, sortOrder }))
      .filter((t) => !existingTopicKeys.has(`${t.subjectId}::${t.title}`));
    if (newTopics.length) {
      await prisma.topic.createMany({ data: newTopics });
      newTopics.forEach((t) => existingTopicKeys.add(`${t.subjectId}::${t.title}`));
    }
  }

  for (const [subjectName, topicList] of Object.entries(topicsBySubject)) {
    const subjectId = subjectMap.get(subjectName);
    if (!subjectId) continue;
    await Promise.all(
      topicList.map(({ title, sortOrder }) =>
        prisma.topic.updateMany({
          where: { subjectId, title },
          data: { sortOrder },
        })
      )
    );
  }

  // Map topic titles → ids
  const topicMap = new Map(
    (await prisma.topic.findMany({ select: { id: true, title: true } }))
      .map(({ id, title }) => [title, id] as const)
  );

  // 3) WAEC-style questions
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

  const existingQuestionKeys = new Set(
    (await prisma.pastQuestion.findMany({
      select: { subjectId: true, topicId: true, questionText: true },
    })).map((q) => `${q.subjectId}::${q.topicId}::${q.questionText}`)
  );
  const newQuestions = resolvedQuestions.filter(
    (q) => !existingQuestionKeys.has(`${q.subjectId}::${q.topicId}::${q.questionText}`)
  );
  if (newQuestions.length) {
    await prisma.pastQuestion.createMany({ data: newQuestions });
  }

  // 4) Mock exam templates
  const existingTemplateKeys = new Set(
    (await prisma.mockExamTemplate.findMany({ select: { subjectId: true, title: true } }))
      .map((m) => `${m.subjectId}::${m.title}`)
  );
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

  const newTemplates = resolvedTemplates.filter(
    (m) => !existingTemplateKeys.has(`${m.subjectId}::${m.title}`)
  );
  if (newTemplates.length) {
    await prisma.mockExamTemplate.createMany({ data: newTemplates });
  }

  console.log("WAEC seed completed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
