import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getResourceService } from "@/lib/resources/resource-service";
import { resourceRouteErrorResponse } from "@/lib/resources/http";
import { resourceApprovalSchema } from "@/lib/resources/schemas";

interface RouteContext {
  params: Promise<{ resourceId: string }>;
}

export async function POST(req: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if ("errorResponse" in auth) return auth.errorResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const parsed = resourceApprovalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "Invalid approval request." },
      { status: 400 }
    );
  }

  const { resourceId } = await context.params;

  try {
    const result = await getResourceService().decideApproval(
      resourceId,
      auth.dbUser.id,
      parsed.data
    );
    return NextResponse.json(result);
  } catch (error) {
    return resourceRouteErrorResponse(error);
  }
}
