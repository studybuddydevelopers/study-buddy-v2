// app/sign-up/page.tsx (SERVER COMPONENT)

import SignUpClient from "./SignUpClient";

export default async function SignUpPage() {
  // Optional: Simulate loading
  await new Promise((r) => setTimeout(r, 1000));

  return <SignUpClient />;
}
