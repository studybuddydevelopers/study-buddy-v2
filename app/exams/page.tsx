// app/exams/page.tsx

import { createPageMetadata } from "@/lib/site-metadata";
import MockExamsHub from "./MockExamsHub";

export const metadata = createPageMetadata({
  title: "Mock Exams",
  description:
    "Choose a full WAEC Mathematics mock exam or a shorter Study Buddy practice session that fits the time you have available.",
  index: false,
});

export default function ExamsPage() {
  return <MockExamsHub />;
}
