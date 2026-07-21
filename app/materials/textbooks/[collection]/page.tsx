import { notFound } from "next/navigation";
import CollectionComingSoon from "../../CollectionComingSoon";

const TEXTBOOK_COLLECTIONS: Record<string, string> = {
  "most-popular": "Most Popular",
  "community-favourite": "Community Favourite",
  others: "Others",
};

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
