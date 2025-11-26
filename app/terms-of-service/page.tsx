export default async function TermsOfServicePage() {
  await new Promise(r => setTimeout(r, 1000)); // simulate loading
  throw new Error("Testing the global error page");

  return (
    <div>TermsOfServicePage</div>
  )
}