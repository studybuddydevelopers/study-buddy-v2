import { notFound } from "next/navigation";
import CollectionComingSoon from "../../CollectionComingSoon";

const FLASHCARD_COLLECTIONS: Record<string, string> = {
  community: "Community FlashCards",
  standard: "Standard FlashCards",
};

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
