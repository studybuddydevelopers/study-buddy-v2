// app/verify-email/page.tsx
import ClientEmailVerify from "./ClientEmailVerify";

export default async function VerifyEmailPage() {
  // simulate server-side loading
  await new Promise((r) => setTimeout(r, 1000));

  return <ClientEmailVerify />;
}
