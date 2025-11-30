// app/forgot-password/page.tsx

import ForgotPasswordClient from "./ForgotPasswordClient";

export default async function ForgotPasswordPage() {
  // Optional: simulate SSR delay
  await new Promise((r) => setTimeout(r, 500));

  return <ForgotPasswordClient />;
}
