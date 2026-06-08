"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function savePrediction(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const fixtureId = Number(formData.get("fixtureId"));
  const homeScore = Number(formData.get("homeScore"));
  const awayScore = Number(formData.get("awayScore"));

  if (!fixtureId || Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
    redirect("/fixtures?error=Invalid prediction");
  }

  if (homeScore < 0 || awayScore < 0) {
    redirect("/fixtures?error=Scores cannot be negative");
  }

  const { data: fixture, error: fixtureError } = await supabase
    .from("fixtures")
    .select("id, kickoff_at")
    .eq("id", fixtureId)
    .single();

  if (fixtureError || !fixture) {
    redirect("/fixtures?error=Fixture not found");
  }

  const kickoffAt = new Date(fixture.kickoff_at);
  const now = new Date();

  if (kickoffAt <= now) {
    redirect("/fixtures?error=Predictions are locked for this fixture");
  }

  const { error } = await supabase.from("predictions").upsert(
    {
      fixture_id: fixtureId,
      user_id: user.id,
      predicted_home_score: homeScore,
      predicted_away_score: awayScore,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "fixture_id,user_id",
    }
  );

  if (error) {
    redirect(`/fixtures?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/fixtures");
  redirect("/fixtures?success=Prediction saved");
}