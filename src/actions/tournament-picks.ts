"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function saveTournamentPick(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const leagueId = String(formData.get("leagueId") || "").trim();
  const teamId = Number(formData.get("teamId"));

  if (!leagueId || !teamId || Number.isNaN(teamId)) {
    redirect(`/dashboard?error=Invalid tournament pick`);
  }

  const { data: membership } = await supabase
    .from("league_members")
    .select("id")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    redirect("/dashboard");
  }

  const { error } = await supabase.from("tournament_picks").upsert(
    {
      user_id: user.id,
      league_id: leagueId,
      team_id: teamId,
      points: 0,
    },
    {
      onConflict: "user_id,league_id",
    }
  );

  if (error) {
    redirect(
      `/leagues/${leagueId}?error=${encodeURIComponent(error.message)}`
    );
  }

  revalidatePath(`/leagues/${leagueId}`);
  revalidatePath("/dashboard");

  redirect(`/leagues/${leagueId}?success=Tournament winner pick saved`);
}