import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TopicPracticeClient from "./TopicPracticeClient";
import { MATERIALS_SUBJECT_LABELS } from "@/lib/materials-display";
import { createPageMetadata } from "@/lib/site-metadata";

const getTopic = cache((topicId: string) =>
  prisma.topic.findUnique({
    where: { id: topicId },
    include: { subject: true },
  })
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topicId: string }>;
}): Promise<Metadata> {
  const { topicId } = await params;
  const topic = topicId ? await getTopic(topicId) : null;

  if (!topic) {
    return createPageMetadata({
      title: "Topic Practice",
      description:
        "Practise WAEC-style questions by topic, review explanations and strengthen your understanding with Study Buddy.",
      index: false,
    });
  }

  const examCode = topic.subject.examCode ?? "";
  const subjectDisplayName =
    (examCode && MATERIALS_SUBJECT_LABELS[examCode]) || topic.subject.name;

  return createPageMetadata({
    title: `${topic.title} Practice`,
    description: `Practise WAEC-style ${topic.title} questions for ${subjectDisplayName}, review explanations and strengthen this topic with Study Buddy.`,
    index: false,
  });
}

export default async function TopicPracticePage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;

  if (!topicId) {
    notFound();
  }

  const topic = await getTopic(topicId);

  if (!topic) {
    notFound();
  }

  const examCode = topic.subject.examCode ?? "";
  const subjectDisplayName =
    (examCode && MATERIALS_SUBJECT_LABELS[examCode]) || topic.subject.name;

  return (
    <TopicPracticeClient
      key={topic.id}
      topicId={topic.id}
      topicTitle={topic.title}
      subjectDisplayName={subjectDisplayName}
    />
  );
}
