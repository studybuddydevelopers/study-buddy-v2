export default async function DashboardPage() {
  await new Promise(r => setTimeout(r, 1000)); // simulate loading
  return <div>DashboardPage</div>;
}
