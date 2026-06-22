import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { syncWorldCupData } from "@/lib/worldcup/sync-worldcup";

export async function GET(request: NextRequest) {
  const secret = process.env.WORLD_CUP_SYNC_SECRET;

  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  const querySecret = request.nextUrl.searchParams.get("secret");

  const providedSecret = bearerToken || querySecret;

  if (!secret || providedSecret !== secret) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const summary = await syncWorldCupData();

    revalidatePath("/fixtures");
    revalidatePath("/dashboard");
    revalidatePath("/leagues");
    revalidatePath("/admin");

    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown World Cup sync error";

    console.error("World Cup sync failed", error);

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
