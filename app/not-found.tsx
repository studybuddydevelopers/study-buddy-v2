import Heading1 from "@/components/Heading1";
import Paragraph from "@/components/Paragraph";
import NotFoundClient from "./NotFoundClient";

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
