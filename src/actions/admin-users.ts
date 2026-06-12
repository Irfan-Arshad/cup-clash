"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function setTemporaryPassword(formData: FormData) {
  const admin = await requireAdmin();

  if (!admin) {
    redirect("/dashboard");
  }

  const userId = String(formData.get("userId") || "").trim();
  const temporaryPassword = String(formData.get("temporaryPassword") || "");

  if (!userId || !temporaryPassword) {
    redirect("/admin?error=Missing user ID or password");
  }

  if (temporaryPassword.length < 8) {
    redirect("/admin?error=Temporary password must be at least 8 characters");
  }

  const supabaseAdmin = createAdminClient();

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: temporaryPassword,
    email_confirm: true,
  });

  if (error) {
    redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/admin?success=Temporary password set");
}