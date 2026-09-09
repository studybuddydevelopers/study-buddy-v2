import { createPageMetadata } from "@/lib/site-metadata";
import AgeVerificationClient from "./AgeVerificationClient";

export const metadata = createPageMetadata({
  title: "Age Check",
  description: "Complete the Study Buddy account age check.",
  index: false,
});

export default function AgeVerificationPage() {
  return <AgeVerificationClient />;
}
