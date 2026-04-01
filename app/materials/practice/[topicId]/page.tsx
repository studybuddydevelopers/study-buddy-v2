import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TopicPracticeClient from "./TopicPracticeClient";
import { MATERIALS_SUBJECT_LABELS } from "@/lib/materials-display";

export default async function TopicPracticePage({
  params,
}: {
  params: { topicId: string };
}) {
  const { topicId } = params;
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: { subject: true },
  });

  if (!topic) {
    notFound();
  }

  const examCode = topic.subject.examCode ?? "";
  const subjectDisplayName =
    (examCode && MATERIALS_SUBJECT_LABELS[examCode]) || topic.subject.name;

  return (
    <TopicPracticeClient
      topicId={topic.id}
      topicTitle={topic.title}
      subjectDisplayName={subjectDisplayName}
    />
  );
}
