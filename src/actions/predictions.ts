"use server";

import { createClient } from "@/lib/supabase/server";

export type SavePredictionState = {
  success?: string;
  error?: string;
  fixtureId?: number;
  predictedHomeScore?: number;
  predictedAwayScore?: number;
};

export async function savePrediction(
  _previousState: SavePredictionState,
  formData: FormData
): Promise<SavePredictionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "You need to log in again.",
    };
  }

  const fixtureId = Number(formData.get("fixtureId"));
  const homeScore = Number(formData.get("homeScore"));
  const awayScore = Number(formData.get("awayScore"));

  if (!fixtureId || Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
    return {
      error: "Invalid prediction.",
    };
  }

  if (homeScore < 0 || awayScore < 0) {
    return {
      error: "Scores cannot be negative.",
    };
  }

  const { data: fixture, error: fixtureError } = await supabase
    .from("fixtures")
    .select("id, kickoff_at")
    .eq("id", fixtureId)
    .single();

  if (fixtureError || !fixture) {
    return {
      error: "Fixture not found.",
    };
  }

  const kickoffAt = new Date(fixture.kickoff_at);
  const now = new Date();

  if (kickoffAt <= now) {
    return {
      error: "Predictions are locked for this fixture.",
    };
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
    return {
      error: error.message,
    };
  }

  return {
    success: "Prediction saved.",
    fixtureId,
    predictedHomeScore: homeScore,
    predictedAwayScore: awayScore,
  };
}