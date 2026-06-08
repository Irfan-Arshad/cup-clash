"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateDisplayName(formData: FormData) {
  const displayName = String(formData.get("displayName") || "").trim();

  if (!displayName) {
    redirect("/profile?error=Display%20name%20is%20required");
  }

  if (displayName.length < 2) {
    redirect("/profile?error=Display%20name%20must%20be%20at%20least%202%20characters");
  }

  if (displayName.length > 40) {
    redirect("/profile?error=Display%20name%20must%20be%2040%20characters%20or%20less");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
    })
    .eq("id", user.id);

  if (error) {
    redirect(
      `/profile?error=${encodeURIComponent("Could not update display name")}`
    );
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/fixtures");
  revalidatePath("/leagues");

  redirect("/profile?success=Display%20name%20updated");
}