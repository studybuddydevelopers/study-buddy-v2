export default async function TermsOfServicePage() {
  await new Promise(r => setTimeout(r, 1000));

  const data = await fetch("https://example.com/boom");

  if (!data.ok) {
    throw new Error("Remote API failed");
  }

  return <div>TermsOfServicePage</div>;
}
