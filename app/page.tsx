// app/page.tsx (SERVER COMPONENT)
import {
  createPageMetadata,
  DEFAULT_SITE_DESCRIPTION,
  DEFAULT_SITE_TITLE,
} from "@/lib/site-metadata";
import ClientLanding from "./ClientLanding";

export const metadata = createPageMetadata({
  title: DEFAULT_SITE_TITLE,
  description: DEFAULT_SITE_DESCRIPTION,
  path: "/",
  absoluteTitle: true,
});

export default async function LandingPage() {
  // You can simulate SSR loading here
  await new Promise(r => setTimeout(r, 1000));

  return <ClientLanding />;
}
