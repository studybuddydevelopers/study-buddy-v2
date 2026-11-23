import { NextResponse } from "next/server";
import { requireMarkingReviewSupport } from "@/lib/marking-review-support";
import { prisma } from "@/lib/prisma";
import { chatReportReviewSchema } from "@/lib/ai/chat-report";
import { reportReceiptSelect } from "@/lib/ai/chat-report-service";
import { chatRouteErrorResponse, parseJsonBody } from "@/lib/ai/chats/http";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireMarkingReviewSupport();
  if ("errorResponse" in auth) return auth.errorResponse;
  const parsed = await parseJsonBody(request, chatReportReviewSchema);
  if (!parsed.success) return parsed.response;
  const { id } = await context.params;
  try {
    const report = await prisma.$transaction(async (tx) => {
      await tx.aiChatMessageReport.updateMany({
        where: { id, status: "OPEN", message: { chat: { deletedAt: null } } },
        data: { status: "REVIEWED", reviewedAt: new Date(), reviewedById: auth.dbUser.id, resolutionNote: parsed.data.resolutionNote },
      });
      return tx.aiChatMessageReport.findFirst({ where: { id, message: { chat: { deletedAt: null } } }, select: reportReceiptSelect });
    });
    if (!report) return NextResponse.json({ message: "Report not found." }, { status: 404 });
    return NextResponse.json({ report }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return chatRouteErrorResponse(error); }
}
