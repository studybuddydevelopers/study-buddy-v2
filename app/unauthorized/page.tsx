// app/unauthorized/page.tsx

import UnauthorizedClient from "./UnauthorizedClient";

export default async function UnauthorizedPage() {
  // Optional SSR loading delay to match your style
  await new Promise((r) => setTimeout(r, 1000));

  return <UnauthorizedClient />;
}
