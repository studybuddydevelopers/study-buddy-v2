import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CollectionComingSoon from "../../CollectionComingSoon";

const TEXTBOOK_COLLECTIONS: Record<string, string> = {
  "most-popular": "Most Popular",
  "community-favourite": "Community Favourite",
  others: "Others",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ collection: string }>;
}): Promise<Metadata> {
  const { collection } = await params;
  const title = TEXTBOOK_COLLECTIONS[collection];

  return {
    title: title ? `${title} Textbooks | Study Buddy` : "Textbooks | Study Buddy",
    description: title
      ? `Browse the ${title} Study Buddy textbook collection for your WAEC subjects.`
      : "Browse Study Buddy textbook collections for your WAEC subjects.",
  };
}

export default async function TextbookCollectionPage({
  params,
}: {
  params: Promise<{ collection: string }>;
}) {
  const { collection } = await params;
  const title = TEXTBOOK_COLLECTIONS[collection];

  if (!title) {
    notFound();
  }

  return (
    <CollectionComingSoon
      title={title}
      materialType="Textbooks"
      backHref="/materials/textbooks"
    />
  );
}
