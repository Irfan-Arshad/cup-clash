import { NextResponse, type NextRequest } from "next/server";

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

  return NextResponse.json({
    ok: true,
    message: "World Cup sync route is live",
  });
}