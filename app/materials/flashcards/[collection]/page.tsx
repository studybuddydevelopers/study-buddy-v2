import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CollectionComingSoon from "../../CollectionComingSoon";

const FLASHCARD_COLLECTIONS: Record<string, string> = {
  community: "Community FlashCards",
  standard: "Standard FlashCards",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ collection: string }>;
}): Promise<Metadata> {
  const { collection } = await params;
  const title = FLASHCARD_COLLECTIONS[collection];

  return {
    title: title ? `${title} | Study Buddy` : "Flashcards | Study Buddy",
    description: title
      ? `Explore the ${title} collection of Study Buddy revision flashcards.`
      : "Explore Study Buddy revision flashcard collections.",
  };
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
