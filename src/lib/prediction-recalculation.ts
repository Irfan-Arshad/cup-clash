import { calculatePredictionPoints } from "@/lib/prediction-scoring";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminSupabaseClient = ReturnType<typeof createAdminClient>;

export async function recalculateFixturePredictionPoints(
  supabase: AdminSupabaseClient,
  fixtureId: number
) {
  const { data: fixture, error: fixtureError } = await supabase
    .from("fixtures")
    .select(
      "id, stage, round_name, home_team_id, away_team_id, home_score, away_score, winning_team_id"
    )
    .eq("id", fixtureId)
    .single();

  if (fixtureError) {
    throw new Error(fixtureError.message);
  }

  const { data: predictions, error: predictionError } = await supabase
    .from("predictions")
    .select(
      "fixture_id, user_id, predicted_home_score, predicted_away_score, predicted_advancing_team_id"
    )
    .eq("fixture_id", fixtureId);

  if (predictionError) {
    throw new Error(predictionError.message);
  }

  const updateResults = await Promise.all(
    (predictions || []).map((prediction) => {
      const points = calculatePredictionPoints(prediction, fixture);

      return supabase
        .from("predictions")
        .update({ points })
        .eq("fixture_id", prediction.fixture_id)
        .eq("user_id", prediction.user_id);
    })
  );

  const updateError = updateResults.find((result) => result.error)?.error;

  if (updateError) {
    throw new Error(updateError.message);
  }
}
