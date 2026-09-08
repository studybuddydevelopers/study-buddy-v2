import Heading1 from "@/components/Heading1";
import Paragraph from "@/components/Paragraph";
import { createPageMetadata } from "@/lib/site-metadata";
import NotFoundClient from "./NotFoundClient";

export const metadata = createPageMetadata({
  title: "Page Not Found",
  description:
    "The requested Study Buddy page does not exist or may have moved; return home or use the site navigation to continue.",
  index: false,
});

export default async function NotFound() {
  // Simulate a server delay
  await new Promise((r) => setTimeout(r, 1000));

  return (
    <div className="flex flex-col justify-center items-center text-center h-[77vh]">
      <Heading1 gutter="sm">Page Not Found</Heading1>

      <Paragraph variant="muted">
        The page you’re looking for doesn’t exist or has been moved.
      </Paragraph>

      {/* Client interactivity lives here */}
      <NotFoundClient />
    </div>
  );
}
