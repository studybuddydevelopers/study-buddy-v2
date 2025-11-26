// app/page.tsx (SERVER COMPONENT)
import ClientLanding from "./ClientLanding";

export default async function LandingPage() {
  // You can simulate SSR loading here
  await new Promise(r => setTimeout(r, 1000));

  return <ClientLanding />;
}
