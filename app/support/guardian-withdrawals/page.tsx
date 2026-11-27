import { notFound } from "next/navigation";
import { requireGuardianWithdrawalOperator } from "@/lib/guardian-withdrawal";
import { createPageMetadata } from "@/lib/site-metadata";
import GuardianWithdrawalForm from "./GuardianWithdrawalForm";

export const metadata = createPageMetadata({
  title: "Guardian Withdrawal",
  description: "Restricted workspace for recording verified guardian withdrawals.",
  index: false,
});

export default async function GuardianWithdrawalPage() {
  const auth = await requireGuardianWithdrawalOperator();
  if ("errorResponse" in auth) notFound();

  return <GuardianWithdrawalForm />;
}
