import { createPageMetadata } from "@/lib/site-metadata";
import NotificationsClient from "./NotificationsClient";

export const metadata = createPageMetadata({
  title: "Notifications",
  description: "Read your Study Buddy marking-review decisions and open the relevant question and support explanation.",
  index: false,
});

export default function NotificationsPage() {
  return <NotificationsClient />;
}
