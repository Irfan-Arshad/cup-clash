"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export async function updateLeagueName(formData: FormData) {
  const admin = await requireAdmin();

  if (!admin) {
    redirect("/dashboard");
  }

  const leagueId = String(formData.get("leagueId") || "");
  const name = String(formData.get("name") || "").trim();

  if (!leagueId) {
    redirect("/admin/leagues?error=League%20not%20found");
  }

  if (!name) {
    redirect("/admin/leagues?error=League%20name%20is%20required");
  }

  if (name.length > 80) {
    redirect("/admin/leagues?error=League%20name%20must%20be%2080%20characters%20or%20less");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("leagues")
    .update({ name })
    .eq("id", leagueId);

  if (error) {
    redirect(`/admin/leagues?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/leagues");
  revalidatePath(`/leagues/${leagueId}`);

  redirect("/admin/leagues?success=League%20updated");
}

export async function deleteLeague(formData: FormData) {
  const admin = await requireAdmin();

  if (!admin) {
    redirect("/dashboard");
  }

  const leagueId = String(formData.get("leagueId") || "");

  if (!leagueId) {
    redirect("/admin/leagues?error=League%20not%20found");
  }

  const supabase = await createClient();

  const { error } = await supabase.from("leagues").delete().eq("id", leagueId);

  if (error) {
    redirect(`/admin/leagues?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/leagues");
  revalidatePath("/dashboard");

  redirect("/admin/leagues?success=League%20deleted");
}

export async function removeLeagueMember(formData: FormData) {
  const admin = await requireAdmin();

  if (!admin) {
    redirect("/dashboard");
  }

  const leagueId = String(formData.get("leagueId") || "");
  const userId = String(formData.get("userId") || "");

  if (!leagueId || !userId) {
    redirect("/admin/leagues?error=Member%20not%20found");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("league_members")
    .delete()
    .eq("league_id", leagueId)
    .eq("user_id", userId);

  if (error) {
    redirect(`/admin/leagues/${leagueId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/leagues");
  revalidatePath(`/admin/leagues/${leagueId}`);
  revalidatePath(`/leagues/${leagueId}`);

  redirect(`/admin/leagues/${leagueId}?success=Member%20removed`);
}