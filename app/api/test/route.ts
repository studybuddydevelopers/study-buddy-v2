// app/api/test/route.ts
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const items = await prisma.testItem.findMany();
    return Response.json({ ok: true, items });
  } catch (err) {
    console.error("Prisma error:", err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
