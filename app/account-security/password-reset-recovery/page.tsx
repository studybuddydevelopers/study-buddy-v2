import PasswordResetRecoveryClient from "./PasswordResetRecoveryClient";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Recover Locked Account",
  description: "Securely begin recovery for a locked Study Buddy account.",
  index: false,
});

export default function PasswordResetRecoveryPage() {
  return <PasswordResetRecoveryClient />;
}
