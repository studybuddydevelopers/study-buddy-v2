// app/already-logged-in/page.tsx

import AlreadyLoggedInClient from "./AlreadyLoggedInClient";

export default async function AlreadyLoggedInPage() {
  // Optional SSR delay like your example
  await new Promise((r) => setTimeout(r, 500));

  return <AlreadyLoggedInClient />;
}
