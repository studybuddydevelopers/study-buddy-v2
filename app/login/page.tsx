// app/login/page.tsx (SERVER COMPONENT)

import LoginClient from "./LoginClient";

export default async function LoginPage() {
  // Simulate SSR delay
  await new Promise((r) => setTimeout(r, 800));

  return <LoginClient />;
}
