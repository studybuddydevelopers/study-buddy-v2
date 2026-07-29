import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getResourceService } from "@/lib/resources/resource-service";
import { resourceRouteErrorResponse } from "@/lib/resources/http";

interface RouteContext {
  params: Promise<{ resourceId: string }>;
}

export async function GET(_req: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if ("errorResponse" in auth) return auth.errorResponse;

  const { resourceId } = await context.params;

  try {
    const result = await getResourceService().getResource(resourceId);
    return NextResponse.json(result);
  } catch (error) {
    return resourceRouteErrorResponse(error);
  }
}
