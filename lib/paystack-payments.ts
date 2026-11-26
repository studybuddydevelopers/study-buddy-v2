import { prisma } from "@/lib/prisma";
import { isRecord } from "@/lib/type-utils";

export function paystackSecretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim();
  return key && key !== "replace-me" && key !== "sk_test_or_live_key" ? key : null;
}

export function parseSuccessfulPaystackCharge(data: unknown) {
  if (!isRecord(data) || data.status !== "success") return null;
  const { reference, amount, currency, metadata } = data;
  const userId = isRecord(metadata) ? metadata.userId : undefined;
  if (
    typeof reference !== "string" || !reference.trim() ||
    typeof userId !== "string" || !userId.trim() ||
    typeof amount !== "number" || !Number.isSafeInteger(amount) || amount <= 0 ||
    typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency)
  ) return null;

  return { reference, userId, amount: amount / 100, currency, status: "success" };
}

export async function recordPaystackCharge(charge: NonNullable<ReturnType<typeof parseSuccessfulPaystackCharge>>) {
  // Both routes use the existing unique reference index to arbitrate concurrent inserts.
  const { count } = await prisma.transaction.createMany({ data: [charge], skipDuplicates: true });
  return count === 1;
}
