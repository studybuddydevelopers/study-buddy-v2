import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getResourceService } from "@/lib/resources/resource-service";
import {
  resourceJsonResponse,
  resourceRouteErrorResponse,
  parsePositiveInt,
} from "@/lib/resources/http";
import { listResourcesQuerySchema } from "@/lib/resources/schemas";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if ("errorResponse" in auth) return auth.errorResponse;

  const url = new URL(req.url);
  const parsed = listResourcesQuerySchema.safeParse({
    page: parsePositiveInt(url.searchParams.get("page"), 1),
    pageSize: parsePositiveInt(url.searchParams.get("pageSize"), 20),
    sourceKind: url.searchParams.get("sourceKind") || undefined,
    processingStatus: url.searchParams.get("processingStatus") || undefined,
    approvalStatus: url.searchParams.get("approvalStatus") || undefined,
    subjectId: url.searchParams.get("subjectId") || undefined,
    topicId: url.searchParams.get("topicId") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "Invalid resource filters." },
      { status: 400 }
    );
  }

  try {
    const result = await getResourceService().listResources(parsed.data);
    return resourceJsonResponse(result);
  } catch (error) {
    return resourceRouteErrorResponse(error);
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("errorResponse" in auth) return auth.errorResponse;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "Expected multipart form data." },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "file is required." },
      { status: 400 }
    );
  }

  try {
    const result = await getResourceService().createUploadedResource(
      auth.dbUser.id,
      file,
      {
        title: formData.get("title")?.toString(),
        description: formData.get("description")?.toString(),
        subjectId: formData.get("subjectId")?.toString() || null,
        topicId: formData.get("topicId")?.toString() || null,
        provenance: formData.get("provenance")?.toString(),
        usageRights: formData.get("usageRights")?.toString(),
      }
    );
    return resourceJsonResponse(result, { status: 201 });
  } catch (error) {
    return resourceRouteErrorResponse(error);
  }
}
