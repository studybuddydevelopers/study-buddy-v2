import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createPageMetadata } from "@/lib/site-metadata";
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

  return createPageMetadata({
    title: title ? `Textbooks: ${title}` : "Textbooks",
    description: title
      ? `Browse the ${title} Study Buddy textbook collection for longer-form WAEC learning and revision resources.`
      : "Browse Study Buddy textbook collections for longer-form WAEC learning and revision resources.",
    index: false,
  });
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
