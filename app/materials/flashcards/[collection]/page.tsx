import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createPageMetadata } from "@/lib/site-metadata";
import CollectionComingSoon from "../../CollectionComingSoon";

const FLASHCARD_COLLECTIONS: Record<string, string> = {
  community: "Community Flashcards",
  standard: "Standard Flashcards",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ collection: string }>;
}): Promise<Metadata> {
  const { collection } = await params;
  const title = FLASHCARD_COLLECTIONS[collection];

  return createPageMetadata({
    title: title ?? "Flashcards",
    description: title
      ? `Review the ${title} collection for quick Study Buddy revision and recall practice.`
      : "Browse Study Buddy flashcard collections for quick revision and recall practice.",
    index: false,
  });
}

export default async function FlashcardCollectionPage({
  params,
}: {
  params: Promise<{ collection: string }>;
}) {
  const { collection } = await params;
  const title = FLASHCARD_COLLECTIONS[collection];

  if (!title) {
    notFound();
  }

  return (
    <CollectionComingSoon
      title={title}
      materialType="Flashcards"
      backHref="/materials/flashcards"
    />
  );
}
