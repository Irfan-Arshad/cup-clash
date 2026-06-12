import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/dashboard";
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const errorCode = requestUrl.searchParams.get("error_code");

  if (error || errorDescription) {
    const message = errorDescription || error || errorCode || "Password reset failed";
    return NextResponse.redirect(
      new URL(
        `/auth/reset-password?error=${encodeURIComponent(message)}`,
        requestUrl.origin
      )
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(
        `/auth/reset-password?error=${encodeURIComponent(
          "Password reset link is missing a code. Please request a new reset link."
        )}`,
        requestUrl.origin
      )
    );
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(
      new URL(
        `/auth/reset-password?error=${encodeURIComponent(exchangeError.message)}`,
        requestUrl.origin
      )
    );
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
