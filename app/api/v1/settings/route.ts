import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const DEFAULT_SETTINGS = {
  cloudPracticeDraftsEnabled: false,
  lowDataModeEnabled: false,
};

function serializeSettings(settings: {
  cloudPracticeDraftsEnabled: boolean;
  lowDataModeEnabled: boolean;
  updatedAt?: Date | null;
}) {
  return {
    cloudPracticeDraftsEnabled: settings.cloudPracticeDraftsEnabled,
    lowDataModeEnabled: settings.lowDataModeEnabled,
    updatedAt: settings.updatedAt?.toISOString() ?? null,
  };
}

export async function GET() {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;
  const { dbUser } = auth;

  const settings = await prisma.userSettings.upsert({
    where: { userId: dbUser.id },
    create: {
      userId: dbUser.id,
      ...DEFAULT_SETTINGS,
    },
    update: {},
  });

  return NextResponse.json({ settings: serializeSettings(settings) });
}

export async function PATCH(req: Request) {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;
  const { dbUser } = auth;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const patch: Partial<typeof DEFAULT_SETTINGS> = {};
  const maybeSettings = body as Partial<Record<keyof typeof DEFAULT_SETTINGS, unknown>>;

  if (maybeSettings.cloudPracticeDraftsEnabled !== undefined) {
    if (typeof maybeSettings.cloudPracticeDraftsEnabled !== "boolean") {
      return NextResponse.json(
        { error: "cloudPracticeDraftsEnabled must be a boolean" },
        { status: 400 }
      );
    }
    patch.cloudPracticeDraftsEnabled = maybeSettings.cloudPracticeDraftsEnabled;
  }

  if (maybeSettings.lowDataModeEnabled !== undefined) {
    if (typeof maybeSettings.lowDataModeEnabled !== "boolean") {
      return NextResponse.json(
        { error: "lowDataModeEnabled must be a boolean" },
        { status: 400 }
      );
    }
    patch.lowDataModeEnabled = maybeSettings.lowDataModeEnabled;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "No settings fields provided" },
      { status: 400 }
    );
  }

  const settings = await prisma.userSettings.upsert({
    where: { userId: dbUser.id },
    create: {
      userId: dbUser.id,
      ...DEFAULT_SETTINGS,
      ...patch,
    },
    update: patch,
  });

  return NextResponse.json({
    success: true,
    settings: serializeSettings(settings),
  });
}
