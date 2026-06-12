"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function signUp(formData: FormData) {
  const supabase = await createClient();

  const displayName = String(formData.get("displayName") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!displayName || !email || !password) {
    redirect("/auth/register?error=missing-fields");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  });

  if (error) {
    redirect(`/auth/register?error=${encodeURIComponent(error.message)}`);
  }

  const userId = data.user?.id;

  if (userId) {
    await supabase.from("profiles").upsert({
      id: userId,
      display_name: displayName,
    });
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    redirect("/auth/login?error=missing-fields");
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/");
}

export async function resetPassword(formData: FormData) {
  const email = String(formData.get("email") || "").trim();

  if (!email) {
    redirect("/auth/reset-password?error=Email%20is%20required");
  }

  const supabase = await createClient();

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/auth/update-password`,
  });

  if (error) {
    redirect(
      `/auth/reset-password?error=${encodeURIComponent(error.message)}`
    );
  }

  redirect(
    "/auth/reset-password?success=Password%20reset%20email%20sent"
  );
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!password || !confirmPassword) {
    redirect(
      "/auth/update-password?error=Password%20and%20confirmation%20are%20required"
    );
  }

  if (password.length < 6) {
    redirect(
      "/auth/update-password?error=Password%20must%20be%20at%20least%206%20characters"
    );
  }

  if (password !== confirmPassword) {
    redirect("/auth/update-password?error=Passwords%20do%20not%20match");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(
      `/auth/update-password?error=${encodeURIComponent(error.message)}`
    );
  }

  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/auth/login?success=Password%20updated.%20Please%20log%20in.");
}
