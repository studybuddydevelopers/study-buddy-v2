import PasswordResetAlertClient from "./PasswordResetAlertClient";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Review Password Activity",
  description: "Review password-reset activity and protect a Study Buddy account.",
  index: false,
});

export default function PasswordResetAlertPage() {
  return <PasswordResetAlertClient />;
}
